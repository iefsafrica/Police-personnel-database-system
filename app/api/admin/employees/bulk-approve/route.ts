import { neon } from "@neondatabase/serverless"
import { withCors, handleOptions } from "@/lib/cors";
import { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

const sql = neon(process.env.DATABASE_URL!)

type PendingEmployee = {
  id: string
  registration_id: string
  firstname: string
  surname: string
  email: string
  position: string
  department?: string
  unit?: string
  command?: string
  status?: string
  metadata?: Record<string, any>
}

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req)
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { registration_ids?: string[] }
    const registrationIds = body.registration_ids

    if (!registrationIds || !Array.isArray(registrationIds) || registrationIds.length === 0) {
      return withCors(req, {
        success: false,
        error: "An array of registration_ids is required",
      }, 400)
    }

    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[],
    }

    for (const registrationId of registrationIds) {
      try {
        // Fetch pending employee
        const pending = (await sql`
          SELECT * FROM pending_employees
          WHERE registration_id = ${registrationId}
        `) as PendingEmployee[]

        if (!pending || pending.length === 0) {
          results.failed.push({ id: registrationId, error: "Pending employee not found" })
          continue
        }

        const employee = pending[0]!
        const name = `${employee.firstname ?? ""} ${employee.surname ?? ""}`.trim()
        const email = employee.email
        const position = employee.position
        const department = employee.department || employee.unit || employee.command || "General"

        if (!name || !email || !position) {
          results.failed.push({ id: registrationId, error: "Missing required fields" })
          continue
        }

        // Prevent duplicate emails
        const existing = await sql`
          SELECT id FROM employees WHERE email = ${email}
        `
        if (existing.length > 0) {
          results.failed.push({ id: registrationId, error: "Employee with this email already exists" })
          continue
        }

        // Try to find matching VerificationData for the employee
        const vdResult = await sql`
          SELECT id FROM "VerificationData"
          WHERE registration_id = ${employee.registration_id}
          LIMIT 1
        `
        const verificationId = vdResult.length > 0 && vdResult[0] ? (vdResult[0] as any).id : null

        // Insert into employees
        // Note: We use registrationId as the employee id for consistency with the single approve endpoint
        await sql`
          INSERT INTO employees (
            id,
            registration_id,
            name,
            email,
            position,
            department,
            status,
            
            hire_date,
            date_of_birth,
            marital_status,
            gender,
            state_of_origin,
            lga_origin,
            job_title,
            assignment_status,
            location,
            zone,
            supervisor,
            command,
            grade_category,
            grade,
            step,
            salary,
            residence_address,
            contact_address,
            telephone_number,
            nationality,
            bank_name,
            sort_code,
            account_number,
            pfa_name,
            pin_number,
            payroll_group,
            staff_category,
            date_terminated,
            legacy_id,
            assignment_start_date,
            person_start_date,
            date_of_last_promotion,
            unit,
            organization_name,
            employee_type,
            bvn,
            tax_id,
            verification_id,

            metadata,
            created_at,
            updated_at
          )
          VALUES (
            ${registrationId},
            ${employee.registration_id},
            ${name},
            ${email},
            ${position},
            ${department},
            'active',

            ${(employee as any).hire_date || null},
            ${(employee as any).date_of_birth || null},
            ${(employee as any).marital_status || null},
            ${(employee as any).gender || null},
            ${(employee as any).state_of_origin || null},
            ${(employee as any).lga_origin || null},
            ${(employee as any).job_title || null},
            ${(employee as any).assignment_status || null},
            ${(employee as any).location || null},
            ${(employee as any).zone || null},
            ${(employee as any).supervisor || null},
            ${(employee as any).command || null},
            ${(employee as any).grade_category || null},
            ${(employee as any).grade || null},
            ${(employee as any).step || null},
            ${(employee as any).salary || null},
            ${(employee as any).residence_address || null},
            ${(employee as any).contact_address || null},
            ${(employee as any).telephone_number || null},
            ${(employee as any).nationality || null},
            ${(employee as any).bank_name || null},
            ${(employee as any).sort_code || null},
            ${(employee as any).account_number || null},
            ${(employee as any).pfa_name || null},
            ${(employee as any).pin_number || null},
            ${(employee as any).payroll_group || null},
            ${(employee as any).staff_category || null},
            ${(employee as any).date_terminated || null},
            ${(employee as any).legacy_id || null},
            ${(employee as any).assignment_start_date || null},
            ${(employee as any).person_start_date || null},
            ${(employee as any).date_of_last_promotion || null},
            ${(employee as any).unit || null},
            ${(employee as any).organization_name || null},
            ${(employee as any).employee_type || null},
            ${(employee as any).bvn || null},
            ${(employee as any).tax_id || null},
            ${verificationId},

            ${employee.metadata ? JSON.stringify(employee.metadata) : "{}"},
            NOW(),
            NOW()
          )
        `

        // Delete from pending
        await sql`
          DELETE FROM pending_employees
          WHERE registration_id = ${registrationId}
        `

        results.success.push(registrationId)
      } catch (err: any) {
        results.failed.push({ id: registrationId, error: err.message })
      }
    }

    return withCors(req, {
      success: true,
      message: `Bulk approval processed: ${results.success.length} successful, ${results.failed.length} failed`,
      results
    })

  } catch (error) {
    console.error("❌ Error in bulk approval:", error)
    return withCors(req, {
      success: false,
      error: "Failed to process bulk approval",
      details: error instanceof Error ? error.message : String(error),
    }, 500)
  }
}

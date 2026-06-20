import { neon } from "@neondatabase/serverless"
import { withCors, handleOptions } from "@/lib/cors";
import { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

const sql = neon(process.env.DATABASE_URL!)

// ✅ Type for pending employee
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
  created_at?: string
  updated_at?: string
}

// Handle CORS preflight
export async function OPTIONS(req: NextRequest) {
  return handleOptions(req)
}

// POST: Approve pending employee
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { registration_id?: string }
    const registrationId = body.registration_id

    if (!registrationId || typeof registrationId !== "string") {
      return withCors(req, {
        success: false,
        error: "Valid registration_id is required",
      }, 400)
    }

    console.log("🔄 Approving employee:", registrationId)

    // Fetch pending employee
    const pending = (await sql`
      SELECT * FROM pending_employees
      WHERE registration_id = ${registrationId}
    `) as PendingEmployee[]

    if (!pending || pending.length === 0) {
      return withCors(req, {
        success: false,
        error: "Pending employee not found",
      }, 404)
    }

    const employee = pending[0]!

    // Build full name
    const name = `${employee.firstname ?? ""} ${employee.surname ?? ""}`.trim()
    const email = employee.email
    const position = employee.position
    const department = employee.department || employee.unit || employee.command || "General"

    if (!name || !email || !position) {
      return withCors(req, {
        success: false,
        error: "Pending employee missing required fields",
      }, 400)
    }

    // ✅ Use registration_id from request as the new employees.id
    const employeeId = registrationId

    // Prevent duplicate emails
    const existing = await sql`
      SELECT id FROM employees WHERE email = ${email}
    `
    if (existing.length > 0) {
      return withCors(req, {
        success: false,
        error: "Employee with this email already exists",
      }, 409)
    }

    // Try to find matching VerificationData for the employee (supports both numeric serial ID and NPF string ID)
    let verificationId = null;
    const regResult = await sql`
      SELECT id FROM registrations WHERE registration_id = ${employee.registration_id} LIMIT 1
    `;
    if (regResult.length > 0) {
      const regSerialId = regResult[0].id;
      const vdResult = await sql`
        SELECT id FROM "VerificationData"
        WHERE registration_id = ${employee.registration_id} 
           OR registration_id = ${String(regSerialId)}
        LIMIT 1
      `;
      if (vdResult.length > 0 && vdResult[0]) {
        verificationId = (vdResult[0] as any).id;
      }
    } else {
      const vdResult = await sql`
        SELECT id FROM "VerificationData"
        WHERE registration_id = ${employee.registration_id}
        LIMIT 1
      `;
      if (vdResult.length > 0 && vdResult[0]) {
        verificationId = (vdResult[0] as any).id;
      }
    }

    // Insert into employees
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
        ${employeeId},
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

    return withCors(req, {
      success: true,
      message: "Employee approved successfully",
      employeeId
    })

  } catch (error) {
    console.error("❌ Error approving employee:", error)

    return withCors(req, {
      success: false,
      error: "Failed to approve employee",
      details: error instanceof Error ? error.message : String(error),
    }, 500)
  }
}

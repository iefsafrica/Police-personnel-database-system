import { neon } from "@neondatabase/serverless";
import { NextRequest } from "next/server";
import { withCors, handleOptions } from "@/lib/cors";
import { buildPersonnelCardData } from "@/lib/personnel-card";

const sql = neon(process.env.DATABASE_URL!);

export const dynamic = "force-dynamic";

// Handle OPTIONS preflight request
export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

// GET: Retrieve detailed profile for a single active employee by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await sql`
      SELECT
        e.id,
        e.registration_id,
        e.name,
        e.email,
        e.department,
        e.position,
        e.status,
        e.join_date,
        e.hire_date,
        e.date_of_birth,
        e.marital_status,
        e.gender,
        e.state_of_origin,
        e.lga_origin,
        e.job_title,
        e.assignment_status,
        e.location,
        e.zone,
        e.supervisor,
        e.command,
        e.grade_category,
        e.grade,
        e.step,
        e.salary,
        e.residence_address,
        e.contact_address,
        e.telephone_number,
        e.nationality,
        e.bank_name,
        e.sort_code,
        e.account_number,
        e.pfa_name,
        e.pin_number,
        e.payroll_group,
        e.staff_category,
        e.date_terminated,
        e.legacy_id,
        e.assignment_start_date,
        e.person_start_date,
        e.date_of_last_promotion,
        e.unit,
        e.organization_name,
        e.employee_type,
        e.bvn,
        e.tax_id,
        e.verification_id,
        e.metadata,
        e.created_at,
        e.updated_at
      FROM employees e
      WHERE e.id = ${id}
      LIMIT 1
    `;

    if (result.length === 0) {
      return withCors(req, { success: false, error: "Employee not found" }, 404);
    }

    const row = result[0] as Record<string, any>;
    const employeeData = buildPersonnelCardData({ employee: row });

    return withCors(req, { success: true, data: employeeData });
  } catch (error: any) {
    console.error("GET employee by ID failed:", error);
    return withCors(req, { success: false, error: error.message || "Failed to fetch employee details" }, 500);
  }
}

// PATCH/PUT: Update selected fields for an employee dynamically
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, any>;

    // Verify employee exists first
    const existing = await sql`SELECT id FROM employees WHERE id = ${id} LIMIT 1`;
    if (existing.length === 0) {
      return withCors(req, { success: false, error: "Employee not found" }, 404);
    }

    // Build dynamic update statements
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const excludedKeys = ["id", "created_at", "updated_at", "metadata"];

    for (const [key, val] of Object.entries(body)) {
      if (excludedKeys.includes(key)) continue;

      updates.push(`"${key}" = $${paramIndex}`);

      // Parse dates safely if database matches date types
      const dateKeys = ["hire_date", "date_of_birth", "date_terminated", "assignment_start_date", "person_start_date", "date_of_last_promotion", "join_date"];
      if (dateKeys.includes(key) && val) {
        values.push(new Date(String(val)));
      } else {
        values.push(val);
      }
      paramIndex++;
    }

    if ("nin" in body) {
      const metadataIndex = paramIndex;
      const currentMetadata =
        body.metadata && typeof body.metadata === "object" ? body.metadata : {};
      const nextMetadata = {
        ...currentMetadata,
        NIN: body.nin ?? currentMetadata.NIN ?? null,
        ninVerified: false,
        "NIN Verified": false,
      };

      updates.push(`"metadata" = $${metadataIndex}`);
      values.push(JSON.stringify(nextMetadata));
      paramIndex++;
    }

    if (updates.length === 0) {
      return withCors(req, { success: false, error: "No valid fields provided to update" }, 400);
    }

    // Append updated_at
    updates.push(`"updated_at" = NOW()`);

    // Append ID parameter
    values.push(id);

    const query = `
      UPDATE employees
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await sql.query(query, values);

    return withCors(req, {
      success: true,
      message: "Employee details updated successfully",
      data: result[0]
    });

  } catch (error: any) {
    console.error("PATCH employee failed:", error);
    return withCors(req, { success: false, error: error.message || "Failed to update employee details" }, 500);
  }
}

// Support PUT by mapping it to PATCH
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(req, context);
}

// DELETE: Terminate or delete employee record by ID
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify employee exists
    const existing = await sql`SELECT id FROM employees WHERE id = ${id} LIMIT 1`;
    if (existing.length === 0) {
      return withCors(req, { success: false, error: "Employee not found" }, 404);
    }

    await sql`DELETE FROM employees WHERE id = ${id}`;

    return withCors(req, { success: true, message: "Employee record deleted successfully" });
  } catch (error: any) {
    console.error("DELETE employee failed:", error);
    return withCors(req, { success: false, error: error.message || "Failed to delete employee record" }, 500);
  }
}

import { neon } from "@neondatabase/serverless";
import { NextRequest } from "next/server";
import { withCors, handleOptions } from "@/lib/cors";

const sql = neon(process.env.DATABASE_URL!);

export const dynamic = "force-dynamic";

// Handle OPTIONS preflight request
export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

// GET: Check profile status by registration ID / employee ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || id.trim() === "") {
      return withCors(req, { success: false, error: "Registration ID is required" }, 400);
    }

    const regIdNormalized = id.toUpperCase().trim();

    // 1️⃣ Check active employees table
    const activeResult = await sql`
      SELECT *
      FROM employees
      WHERE UPPER(id) = ${regIdNormalized} OR UPPER(registration_id) = ${regIdNormalized}
      LIMIT 1
    `;

    if (activeResult.length > 0) {
      const emp = activeResult[0]!;
      return withCors(req, {
        success: true,
        exists: true,
        ninVerified: true,
        status: "active",
        profileCompleteness: 100,
        message: "Profile is active and approved.",
        data: {
          ...emp,
          registrationId: emp.id,
          createdAt: emp.created_at,
          updatedAt: emp.updated_at
        }
      });
    }

    // 2️⃣ Check pending employees table
    const pendingResult = await sql`
      SELECT *
      FROM pending_employees
      WHERE UPPER(registration_id) = ${regIdNormalized}
      LIMIT 1
    `;

    if (pendingResult.length > 0) {
      const pending = pendingResult[0]!;
      const missingFields = (pending.missing_fields || {}) as Record<string, any>;
      
      const ninVerified = missingFields.ninVerified === true;
      const profileCompleteness = typeof missingFields.profileCompleteness === 'number' 
        ? missingFields.profileCompleteness 
        : 70; // fallback default

      if (!ninVerified) {
        return withCors(req, {
          success: true,
          exists: true,
          ninVerified: false,
          status: "pending_approval",
          profileCompleteness,
          message: "Your profile is pending approval, but your NIN is not yet verified. Please verify your NIN.",
          data: {
            ...pending,
            registrationId: pending.registration_id,
            name: `${pending.firstname} ${pending.surname}`,
            createdAt: pending.created_at,
            updatedAt: pending.updated_at
          }
        });
      }

      return withCors(req, {
        success: true,
        exists: true,
        ninVerified: true,
        status: "pending_approval",
        profileCompleteness,
        message: "Profile is complete and pending administrator approval.",
        data: {
          ...pending,
          registrationId: pending.registration_id,
          name: `${pending.firstname} ${pending.surname}`,
          createdAt: pending.created_at,
          updatedAt: pending.updated_at
        }
      });
    }

    // 3️⃣ Check registrations table
    const regResult = await sql`
      SELECT id, registration_id, status, current_step, created_at
      FROM registrations
      WHERE UPPER(registration_id) = ${regIdNormalized}
      LIMIT 1
    `;

    if (regResult.length > 0) {
      const reg = regResult[0]!;
      
      // Check populated sub-records
      const personalCheck = await sql`SELECT id FROM personal_info WHERE UPPER(registration_id) = ${regIdNormalized} LIMIT 1`;
      const employmentCheck = await sql`SELECT id FROM employment_info WHERE UPPER(registration_id) = ${regIdNormalized} LIMIT 1`;
      const docsCheck = await sql`SELECT id FROM document_uploads WHERE UPPER(registration_id) = ${regIdNormalized} LIMIT 1`;
      const vdCheck = await sql`SELECT nin FROM "VerificationData" WHERE UPPER(registration_id) = ${regIdNormalized} LIMIT 1`;

      const hasPersonal = personalCheck.length > 0;
      const hasEmployment = employmentCheck.length > 0;
      const hasDocs = docsCheck.length > 0;
      const hasVd = vdCheck.length > 0 && vdCheck[0]?.nin !== null && vdCheck[0]?.nin !== "";

      // Calculate completeness percentage
      let profileCompleteness = 10; // base step
      if (hasPersonal) profileCompleteness += 30;
      if (hasEmployment) profileCompleteness += 30;
      if (hasDocs) profileCompleteness += 30;

      const ninVerified = !!hasVd;

      // Extract name/email if personal info exists
      let name = "New Registrant";
      let email = "";
      if (hasPersonal) {
        const personal = await sql`SELECT first_name, surname, email FROM personal_info WHERE UPPER(registration_id) = ${regIdNormalized} LIMIT 1`;
        if (personal[0]) {
          name = `${personal[0].first_name} ${personal[0].surname}`;
          email = personal[0].email;
        }
      }

      if (!ninVerified) {
        return withCors(req, {
          success: true,
          exists: true,
          ninVerified: false,
          status: reg.status || "draft",
          profileCompleteness,
          message: "Please verify your NIN to proceed with registration.",
          data: {
            registrationId: reg.registration_id,
            name,
            email,
            status: reg.status,
            currentStep: reg.current_step,
            createdAt: reg.created_at
          }
        });
      }

      return withCors(req, {
        success: true,
        exists: true,
        ninVerified: true,
        status: reg.status || "draft",
        profileCompleteness,
        message: "NIN is verified. Continue filling out your registration details.",
        data: {
          registrationId: reg.registration_id,
          name,
          email,
          status: reg.status,
          currentStep: reg.current_step,
          createdAt: reg.created_at
        }
      });
    }

    // 4️⃣ ID does not exist anywhere in system
    return withCors(req, {
      success: false,
      exists: false,
      message: "Employee ID does not exist in the system."
    }, 404);

  } catch (error: any) {
    console.error("GET profile status failed:", error);
    return withCors(req, {
      success: false,
      error: error.message || "Failed to fetch profile status"
    }, 500);
  }
}

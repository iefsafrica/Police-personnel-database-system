import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { withCors, handleOptions } from "@/lib/cors";
import {
  buildRegistrationIdVariants,
  resolveRegistrationIdInput,
} from "@/lib/registration-id";

const sql = neon(process.env.DATABASE_URL!);

/* -------------------------
   TYPES
------------------------- */
interface EmploymentInfoBody {
  employment_id_no: string;
  service_no: string;
  file_no: string;
  rank_position: string;
  department: string;
  organization: string;
  employment_type: string;
  probation_period: string;
  work_location: string;
  date_of_first_appointment: string;
  grade_level: string;
  step: string;
  salary_structure: string;
  cadre: string;
  bank_name: string;
  nuban_account_number: string;
  pfa_name: string;
  rsa_pin: string;
  registration_id?: string;
  gl?: string;
  account_number?: string;
  name_of_bank?: string;
  rsapin?: string;
}

/* -------------------------
   OPTIONS
------------------------- */
export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

/* -------------------------
   POST: EMPLOYEE INFO
------------------------- */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EmploymentInfoBody;
    const registration_id = resolveRegistrationIdInput(
      req.headers.get("x-registration-id"),
      body.registration_id
    );

    if (!registration_id) {
      return withCors(req, {
        success: false,
        message: "Missing registration ID in headers"
      }, 400);
    }

    const {
      employment_id_no,
      service_no,
      file_no,
      rank_position,
      department,
      organization,
      employment_type,
      probation_period,
      work_location,
      date_of_first_appointment,
      step,
      salary_structure,
      cadre,
      pfa_name,
    } = body;

    const gradeLevel = body.grade_level ?? body.gl;
    const bankName = body.bank_name ?? body.name_of_bank;
    const accountNumber = body.nuban_account_number ?? body.account_number;
    const rsaPin = body.rsa_pin ?? body.rsapin;

    /* -------------------------
       VALIDATION
    ------------------------- */
    /* -------------------------
       VALIDATION
    ------------------------- */
    const missing: string[] = [];
    if (!employment_id_no) missing.push("employment_id_no");
    if (!rank_position) missing.push("rank_position");
    if (!department) missing.push("department");

    if (missing.length > 0) {
      return withCors(req, {
        success: false,
        message: `Required fields are missing: ${missing.join(", ")}`,
        missingFields: missing
      }, 400);
    }

    /* -------------------------
       CHECK REGISTRATION EXISTS
    ------------------------- */
    let existing: Array<{ registration_id: string }> = [];
    for (const candidate of buildRegistrationIdVariants(registration_id)) {
      existing = (await sql`
        SELECT registration_id
        FROM registrations
        WHERE registration_id = ${candidate}
        LIMIT 1
      `) as Array<{ registration_id: string }>;
      if (existing.length > 0) break;
    }

    if (existing.length === 0) {
      return withCors(req, {
        success: false,
        message: "Invalid registration ID"
      }, 404);
    }

    const resolvedRegistrationId = existing[0]!.registration_id as string;

    // --- Sensible default fallbacks for non-nullable DB fields ---
    const fallbackServiceNo = service_no || "N/A";
    const fallbackFileNo = file_no || "N/A";
    const fallbackOrganization = organization || "Police Force";
    const fallbackEmploymentType = employment_type || "Permanent";
    const fallbackProbationPeriod = probation_period || "None";
    const fallbackWorkLocation = work_location || "N/A";
    const fallbackDateOfFirstAppointment = date_of_first_appointment || "1970-01-01";
    const fallbackGl = gradeLevel || "1";
    const fallbackStep = step || "1";
    const fallbackSalaryStructure = salary_structure || "CONPSS";
    const fallbackCadre = cadre || "N/A";
    const fallbackBankName = bankName || "N/A";
    const fallbackAccountNumber = accountNumber || "0000000000";
    const fallbackPfaName = pfa_name || "N/A";
    const fallbackRsaPin = rsaPin || "N/A";

    /* -------------------------
       INSERT EMPLOYEE INFO
    ------------------------- */
    await sql`
      INSERT INTO employment_info (
        registration_id,
        employment_id_no,
        service_no,
        file_no,
        rank_position,
        department,
        organization,
        employment_type,
        probation_period,
        work_location,
        date_of_first_appointment,
        gl,
        step,
        salary_structure,
        cadre,
        name_of_bank,
        account_number,
        pfa_name,
        rsapin
      )
      VALUES (
        ${resolvedRegistrationId},
        ${employment_id_no},
        ${fallbackServiceNo},
        ${fallbackFileNo},
        ${rank_position},
        ${department},
        ${fallbackOrganization},
        ${fallbackEmploymentType},
        ${fallbackProbationPeriod},
        ${fallbackWorkLocation},
        ${fallbackDateOfFirstAppointment},
        ${fallbackGl},
        ${fallbackStep},
        ${fallbackSalaryStructure},
        ${fallbackCadre},
        ${fallbackBankName},
        ${fallbackAccountNumber},
        ${fallbackPfaName},
        ${fallbackRsaPin}
      )
      ON CONFLICT (registration_id) DO UPDATE SET
        employment_id_no = EXCLUDED.employment_id_no,
        service_no = EXCLUDED.service_no,
        file_no = EXCLUDED.file_no,
        rank_position = EXCLUDED.rank_position,
        department = EXCLUDED.department,
        organization = EXCLUDED.organization,
        employment_type = EXCLUDED.employment_type,
        probation_period = EXCLUDED.probation_period,
        work_location = EXCLUDED.work_location,
        date_of_first_appointment = EXCLUDED.date_of_first_appointment,
        gl = EXCLUDED.gl,
        step = EXCLUDED.step,
        salary_structure = EXCLUDED.salary_structure,
        cadre = EXCLUDED.cadre,
        name_of_bank = EXCLUDED.name_of_bank,
        account_number = EXCLUDED.account_number,
        pfa_name = EXCLUDED.pfa_name,
        rsapin = EXCLUDED.rsapin
    `;

    /* -------------------------
       UPDATE STEP
    ------------------------- */
    await sql`
      UPDATE registrations
      SET current_step = 'documents'
      WHERE registration_id = ${resolvedRegistrationId}
    `;

    /* -------------------------
       SUCCESS RESPONSE
    ------------------------- */
    return withCors(req, {
      success: true,
      message: "Employee information saved successfully",
      next_step: "documents"
    });

  } catch (error: any) {
    console.error("EMPLOYEE INFO ERROR:", error);

    return withCors(req, {
      success: false,
      message: "Failed to save employee information",
      error: error.message
    }, 500);
  }
}

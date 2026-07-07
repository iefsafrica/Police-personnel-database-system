import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { withCors, handleOptions } from "@/lib/cors";
import { resolveRegistrationIdInput } from "@/lib/registration-id";

const sql = neon(process.env.DATABASE_URL!);

/* -------------------------
   TYPES
------------------------- */
interface PersonalInfoBody {
  title?: string;
  surname: string;
  first_name: string;
  other_names?: string;
  phone_number: string;
  email: string;
  date_of_birth: string;
  sex: string;
  marital_status: string;
  state_of_origin: string;
  lga: string;
  state_of_residence: string;
  address_state_of_residence: string;
  next_of_kin_name: string;
  next_of_kin_relationship: string;
  next_of_kin_phone_number: string;
  next_of_kin_address: string;
  nin?: string;
  zone?: string;
  command?: string;
  grade?: string;
  bvn?: string;
  payroll_group?: string;
  staff_category?: string;
  assignment_status?: string;
  location?: string;
  unit?: string;
  organization_name?: string;
  employee_type?: string;
  bank_name?: string;
  sort_code?: string;
  account_number?: string;
  pfa_name?: string;
  pin_number?: string;
  telephone_number?: string;
  telephoneno?: string;
  gender?: string;
  lga_origin?: string;
  residence_address?: string;
  contact_address?: string;
}

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

/* -------------------------
   POST: PERSONAL INFO
------------------------- */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PersonalInfoBody;
    const registration_id = resolveRegistrationIdInput(
      req.headers.get("x-registration-id"),
      (body as { registration_id?: string }).registration_id
    );

    if (!registration_id) {
      return withCors(req, {
        success: false,
        message: "Missing registration ID in headers"
      }, 400);
    }

    const {
      title,
      surname,
      first_name,
      other_names,
      phone_number,
      email,
      date_of_birth,
      sex,
      marital_status,
      state_of_origin,
      lga,
      state_of_residence,
      address_state_of_residence,
      next_of_kin_name,
      next_of_kin_relationship,
      next_of_kin_phone_number,
      next_of_kin_address,
      nin,
      zone,
      command,
      grade,
      bvn,
      payroll_group,
      staff_category,
      assignment_status,
      location,
      unit,
      organization_name,
      employee_type,
      bank_name,
      sort_code,
      account_number,
      pfa_name,
      pin_number,
      telephone_number,
      telephoneno,
      lga_origin,
      residence_address,
      contact_address,
    } = body;

    /* -------------------------
       VALIDATION
    ------------------------- */
    const missing: string[] = [];
    if (!surname) missing.push("surname");
    if (!first_name) missing.push("first_name");
    if (!email) missing.push("email");

    if (missing.length > 0) {
      return withCors(req, {
        success: false,
        message: `Required fields are missing: ${missing.join(", ")}`,
        missingFields: missing
      }, 400);
    }

    /* -------------------------
       CHECK / CREATE REGISTRATION
    ------------------------- */
    const existing = (await sql`
      SELECT id, registration_id
      FROM registrations
      WHERE UPPER(registration_id) = UPPER(${registration_id})
      LIMIT 1
    `) as Array<{ id: number; registration_id: string }>;

    let resolvedRegistrationRow = existing[0] ?? null;

    if (!resolvedRegistrationRow) {
      const inserted = (await sql`
        INSERT INTO registrations (
          registration_id,
          status,
          current_step,
          updated_at
        )
        VALUES (${registration_id}, 'draft', 'personal', NOW())
        ON CONFLICT (registration_id) DO UPDATE SET
          updated_at = NOW()
        RETURNING id, registration_id
      `) as Array<{ id: number; registration_id: string }>;

      resolvedRegistrationRow = inserted[0] ?? null;

      if (!resolvedRegistrationRow) {
        return withCors(req, {
          success: false,
          message: "Registration ID not found"
        }, 404);
      }
    }

    const resolvedRegistrationId = resolvedRegistrationRow.registration_id as string;

    // --- Sensible default fallbacks for non-nullable DB fields ---
    const fallbackTitle = title || "Mr";
    const resolvedTelephone =
      telephone_number?.trim() ||
      telephoneno?.trim() ||
      phone_number?.trim() ||
      null;
    const fallbackTelephone = resolvedTelephone || "0000000000";
    const fallbackBirthdate = date_of_birth || "1970-01-01";
    const fallbackGender = sex || "Unknown";
    const fallbackMaritalStatus = marital_status || "Single";
    const fallbackStateOfOrigin = state_of_origin || "Unknown";
    const fallbackResidenceLga = lga || "Unknown";
    const fallbackResidenceState = state_of_residence || "Unknown";
    const fallbackResidenceAddress = address_state_of_residence || "Unknown";
    const fallbackNokName = next_of_kin_name || "Unknown";
    const fallbackNokRelationship = next_of_kin_relationship || "Unknown";
    const fallbackNokPhone = next_of_kin_phone_number || "0000000000";
    const fallbackNokAddress = next_of_kin_address || "Unknown";
    const fallbackDepartment = command || organization_name || unit || "Unknown";
    const fallbackPosition = grade || employee_type || "Unknown";

    /* -------------------------
       INSERT PERSONAL INFO
    ------------------------- */
    await sql`
      INSERT INTO personal_info (
        registration_id,
        title,
        surname,
        first_name,
        other_names,
        phone_number,
        email,
        date_of_birth,
        sex,
        marital_status,
        state_of_origin,
        lga,
        state_of_residence,
        address_state_of_residence,
        next_of_kin_name,
        next_of_kin_relationship,
        next_of_kin_phone_number,
        next_of_kin_address
      )
      VALUES (
        ${resolvedRegistrationId},
        ${fallbackTitle},
        ${surname},
        ${first_name},
        ${other_names ?? null},
        ${fallbackTelephone},
        ${email},
        ${fallbackBirthdate},
        ${fallbackGender},
        ${fallbackMaritalStatus},
        ${fallbackStateOfOrigin},
        ${fallbackResidenceLga},
        ${fallbackResidenceState},
        ${fallbackResidenceAddress},
        ${fallbackNokName},
        ${fallbackNokRelationship},
        ${fallbackNokPhone},
        ${fallbackNokAddress}
      )
      ON CONFLICT (registration_id) DO UPDATE SET
        title = EXCLUDED.title,
        surname = EXCLUDED.surname,
        first_name = EXCLUDED.first_name,
        other_names = EXCLUDED.other_names,
        phone_number = EXCLUDED.phone_number,
        email = EXCLUDED.email,
        date_of_birth = EXCLUDED.date_of_birth,
        sex = EXCLUDED.sex,
        marital_status = EXCLUDED.marital_status,
        state_of_origin = EXCLUDED.state_of_origin,
        lga = EXCLUDED.lga,
        state_of_residence = EXCLUDED.state_of_residence,
        address_state_of_residence = EXCLUDED.address_state_of_residence,
        next_of_kin_name = EXCLUDED.next_of_kin_name,
        next_of_kin_relationship = EXCLUDED.next_of_kin_relationship,
        next_of_kin_phone_number = EXCLUDED.next_of_kin_phone_number,
        next_of_kin_address = EXCLUDED.next_of_kin_address
    `;

    const verificationRows = (await sql`
      SELECT id, nin
      FROM "VerificationData"
      WHERE registration_id = ${resolvedRegistrationRow.id}
      LIMIT 1
    `) as Array<{ id: string; nin: string | null }>;

    const verificationRow = verificationRows[0] ?? null;
    const employeeName = `${surname} ${first_name}`.trim();
    const employeeMetadata = {
      NIN: nin ?? verificationRow?.nin ?? null,
      Nationality: "Nigerian",
      "Staff ID": resolvedRegistrationId,
      Surname: surname,
      "First Name": first_name,
      "Other Names": other_names ?? null,
      Email: email,
      "Date Of Birth": fallbackBirthdate,
      Gender: fallbackGender,
      "Marital Status": fallbackMaritalStatus,
      "State Of Origin": fallbackStateOfOrigin,
      LGA: fallbackResidenceLga,
      "State Of Residence": fallbackResidenceState,
      "Address State Of Residence": fallbackResidenceAddress,
      "Next Of Kin Name": fallbackNokName,
      "Next Of Kin Relationship": fallbackNokRelationship,
      "Next Of Kin Phone Number": fallbackNokPhone,
      "Next Of Kin Address": fallbackNokAddress,
      Zone: zone ?? null,
      Command: command ?? null,
      Grade: grade ?? null,
      BVN: bvn ?? null,
      "Payroll Group": payroll_group ?? null,
      "Staff Category": staff_category ?? null,
      "Assignment Status": assignment_status ?? null,
      Location: location ?? null,
      Unit: unit ?? null,
      "Organization Name": organization_name ?? null,
      "Employee Type": employee_type ?? null,
      "Bank Name": bank_name ?? null,
      "Sort Code": sort_code ?? null,
      "Account Number": account_number ?? null,
      "PFA Name": pfa_name ?? null,
      "Pin Number": pin_number ?? null,
      "Telephone Number": telephone_number ?? fallbackTelephone,
      "LGA Of Origin": lga_origin ?? fallbackResidenceLga,
      "Residence Address": residence_address ?? fallbackResidenceAddress,
      "Contact Address": contact_address ?? fallbackResidenceAddress,
    };

    await sql`
      INSERT INTO employees (
        id,
        registration_id,
        name,
        email,
        department,
        position,
        status,
        marital_status,
        gender,
        state_of_origin,
        lga_origin,
        zone,
        command,
        grade,
        bvn,
        payroll_group,
        staff_category,
        assignment_status,
        location,
        unit,
        organization_name,
        employee_type,
        contact_address,
        residence_address,
        telephone_number,
        bank_name,
        sort_code,
        account_number,
        pfa_name,
        pin_number,
        nationality,
        verification_id,
        metadata,
        created_at,
        updated_at
      )
      VALUES (
        ${resolvedRegistrationId},
        ${resolvedRegistrationId},
        ${employeeName},
        ${email},
        ${fallbackDepartment},
        ${fallbackPosition},
        'active',
        ${fallbackMaritalStatus},
        ${fallbackGender},
        ${fallbackStateOfOrigin},
        ${lga_origin ?? null},
        ${zone ?? null},
        ${command ?? null},
        ${grade ?? null},
        ${bvn ?? null},
        ${payroll_group ?? null},
        ${staff_category ?? null},
        ${assignment_status ?? null},
        ${location ?? null},
        ${unit ?? null},
        ${organization_name ?? null},
        ${employee_type ?? null},
        ${contact_address ?? fallbackResidenceAddress},
        ${fallbackResidenceAddress},
        ${fallbackTelephone},
        ${bank_name ?? null},
        ${sort_code ?? null},
        ${account_number ?? null},
        ${pfa_name ?? null},
        ${pin_number ?? null},
        'Nigerian',
        ${verificationRow?.id ?? null},
        ${JSON.stringify(employeeMetadata)},
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        registration_id = EXCLUDED.registration_id,
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        department = EXCLUDED.department,
        position = EXCLUDED.position,
        status = EXCLUDED.status,
        marital_status = EXCLUDED.marital_status,
        gender = EXCLUDED.gender,
        state_of_origin = EXCLUDED.state_of_origin,
        lga_origin = EXCLUDED.lga_origin,
        zone = EXCLUDED.zone,
        command = EXCLUDED.command,
        grade = EXCLUDED.grade,
        bvn = EXCLUDED.bvn,
        payroll_group = EXCLUDED.payroll_group,
        staff_category = EXCLUDED.staff_category,
        assignment_status = EXCLUDED.assignment_status,
        location = EXCLUDED.location,
        unit = EXCLUDED.unit,
        organization_name = EXCLUDED.organization_name,
        employee_type = EXCLUDED.employee_type,
        contact_address = EXCLUDED.contact_address,
        residence_address = EXCLUDED.residence_address,
        telephone_number = EXCLUDED.telephone_number,
        bank_name = EXCLUDED.bank_name,
        sort_code = EXCLUDED.sort_code,
        account_number = EXCLUDED.account_number,
        pfa_name = EXCLUDED.pfa_name,
        pin_number = EXCLUDED.pin_number,
        nationality = EXCLUDED.nationality,
        verification_id = EXCLUDED.verification_id,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    `;

    /* -------------------------
       UPDATE STEP
    ------------------------- */
    await sql`
      UPDATE registrations
      SET current_step = 'employment'
      WHERE registration_id = ${resolvedRegistrationId}
    `;

    /* -------------------------
       SUCCESS RESPONSE
    ------------------------- */
    return withCors(req, {
      success: true,
      message: "Personal information saved successfully",
      next_step: "employment"
    });

  } catch (error: any) {
    console.error("PERSONAL INFO ERROR:", error);

    return withCors(req, {
      success: false,
      message: "Failed to save personal information",
      error: error.message
    }, 500);
  }
}

import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { withCors, handleOptions } from "@/lib/cors";
import {
  normalizeRegistrationLookupValue,
  resolveRegistrationIdInput,
} from "@/lib/registration-id";
import { uploadToBlob } from "@/lib/blob-storage";

export const config = {
  api: {
    bodyParser: false,
  },
};

const sql = neon(process.env.DATABASE_URL!);

/* -------------------------
   File Upload Config
------------------------- */
const ALLOWED_EXT = ["pdf", "jpg", "jpeg", "png"];

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

/* -------------------------
   POST: DOCUMENT UPLOAD
------------------------- */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const registration_id = resolveRegistrationIdInput(
      req.headers.get("x-registration-id"),
      formData.get("registration_id")?.toString() ?? null
    );

    if (!registration_id) {
      return withCors(req, { success: false, message: "Missing registration ID in headers" }, 400);
    }

    const registrationLookup = normalizeRegistrationLookupValue(registration_id);
    const existing = (await sql`
      SELECT r.registration_id
      FROM registrations r
      LEFT JOIN "VerificationData" v ON v.registration_id = r.id
      WHERE UPPER(r.registration_id) = ${registrationLookup}
         OR UPPER(COALESCE(v.userid, '')) = ${registrationLookup}
      LIMIT 1
    `) as Array<{ registration_id: string }>;

    if (existing.length === 0) {
      return withCors(req, { success: false, message: "Registration ID not found" }, 404);
    }

    const resolvedRegistrationId = existing[0]!.registration_id as string;

    const uploadFile = async (fieldName: string, required = false) => {
      const file = formData.get(fieldName) as File | null;
      if (!file) {
        if (required) throw new Error(`${fieldName} is required`);
        return null;
      }

      // Validate file type
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !ALLOWED_EXT.includes(ext)) throw new Error(`${fieldName} has invalid file type`);

      // Upload to Cloudinary
      return await uploadToBlob(file, file.name);
    };

    // Upload all required/optional files
    const appointmentLetter = await uploadFile("appointment_letter", true);
    const educationalCertificates = await uploadFile("educational_certificates", true);
    const promotionLetter = await uploadFile("promotion_letter", false);
    const otherDocuments = await uploadFile("other_documents", false);
    const profileImage = await uploadFile("profile_image", true);
    const signature = await uploadFile("signature", true);

    // Insert uploaded URLs into database
    await sql`
      INSERT INTO document_uploads (
        registration_id,
        appointment_letter_path,
        educational_certificates_path,
        promotion_letter_path,
        other_documents_path,
        profile_image_path,
        signature_path,
        status,
        upload_date
      )
      VALUES (
        ${resolvedRegistrationId},
        ${appointmentLetter},
        ${educationalCertificates},
        ${promotionLetter ?? null},
        ${otherDocuments ?? null},
        ${profileImage},
        ${signature},
        'pending',
        NOW()
      )
      ON CONFLICT (registration_id) DO UPDATE SET
        appointment_letter_path = EXCLUDED.appointment_letter_path,
        educational_certificates_path = EXCLUDED.educational_certificates_path,
        promotion_letter_path = EXCLUDED.promotion_letter_path,
        other_documents_path = EXCLUDED.other_documents_path,
        profile_image_path = EXCLUDED.profile_image_path,
        signature_path = EXCLUDED.signature_path,
        status = COALESCE(EXCLUDED.status, document_uploads.status),
        upload_date = NOW()
    `;

    // Update registration step
    await sql`
      UPDATE registrations
      SET current_step = 'completed',
          updated_at = NOW()
      WHERE registration_id = ${resolvedRegistrationId}
    `;

    return withCors(req, {
      success: true,
      message: "Documents uploaded successfully",
      next_step: "completed",
    });
  } catch (error: any) {
    console.error("DOCUMENT UPLOAD ERROR:", error);
    return withCors(req, {
      success: false,
      message: "Failed to upload documents",
      error: error.message,
    }, 500);
  }
}

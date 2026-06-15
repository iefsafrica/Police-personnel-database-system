import { neon } from "@neondatabase/serverless";
import { withCors, handleOptions } from "@/lib/cors";
import { NextRequest } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { canonicalizeRegistrationId } from "@/lib/registration-id";
import { uploadToBlob } from "@/lib/blob-storage";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Neon client
const sql = neon(process.env.DATABASE_URL!);

// Handle CORS preflight
export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

function isFile(f: any): f is File {
  return f && typeof f === "object" && typeof f.size === "number" && typeof f.text === "function";
}

function getRowValue(row: Record<string, string>, possibleKeys: string[]): string {
  const rowKeys = Object.keys(row);
  for (const pk of possibleKeys) {
    if (row[pk] !== undefined && row[pk] !== null) {
      return String(row[pk]).trim();
    }
  }
  for (const pk of possibleKeys) {
    const normalizedPk = pk.toLowerCase().replace(/[\s_-]/g, "");
    const matchingKey = rowKeys.find(rk => {
      const normalizedRk = rk.toLowerCase().replace(/[\s_-]/g, "");
      return normalizedRk === normalizedPk;
    });
    if (matchingKey !== undefined && row[matchingKey] !== null) {
      return String(row[matchingKey]).trim();
    }
  }
  return "";
}

function parseDate(val?: string | number | null) {
  if (val === undefined || val === null) return null;
  const strVal = String(val).trim();
  if (!strVal) return null;

  const num = Number(strVal);
  if (!isNaN(num) && num >= 10000 && num <= 100000) {
    // Convert Excel serial date
    const d = new Date((num - 25569) * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(strVal);
  return isNaN(d.getTime()) ? null : d;
}

function parseDecimal(val?: string | number | null) {
  if (val === undefined || val === null) return null;
  const strVal = String(val).trim();
  if (!strVal) return null;
  const num = parseFloat(strVal.replace(/,/g, ""));
  return isNaN(num) ? null : num;
}

function calculateCompleteness(employee: any) {
  const fields = [
    { key: "firstname", label: "First Name" },
    { key: "surname", label: "Surname" },
    { key: "email", label: "Email Address" },
    { key: "telephone_number", label: "Telephone Number" },
    { key: "gender", label: "Gender" },
    { key: "date_of_birth", label: "Date of Birth" },
    { key: "marital_status", label: "Marital Status" },
    { key: "state_of_origin", label: "State of Origin" },
    { key: "lga_origin", label: "LGA of Origin" },
    { key: "residence_address", label: "Residence Address" },
    { key: "hire_date", label: "Hire Date" },
    { key: "job_title", label: "Job Title" },
    { key: "location", label: "Location" },
    { key: "command", label: "Command" },
    { key: "grade", label: "Grade" },
    { key: "step", label: "Step" },
    { key: "salary", label: "Salary" },
    { key: "bank_name", label: "Bank Name" },
    { key: "account_number", label: "Account Number" },
    { key: "pfa_name", label: "PFA Name" }
  ];

  const missing = [];
  let filledCount = 0;

  for (const field of fields) {
    const val = employee[field.key];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      filledCount++;
    } else {
      missing.push(field.label);
    }
  }

  const percentage = Math.round((filledCount / fields.length) * 100);
  return { percentage, missing };
}

async function generateImportRegistrationId(localUsedIds: Set<string>): Promise<string> {
  let nextIdNum = 1;
  while (true) {
    const candidate = canonicalizeRegistrationId(`NPF-${nextIdNum}`);
    
    // Check local set first
    if (localUsedIds.has(candidate)) {
      nextIdNum++;
      continue;
    }

    // Check registrations table
    const regExists = await sql`
      SELECT 1 FROM registrations 
      WHERE registration_id = ${candidate} OR registration_id = ${candidate.toLowerCase()} 
      LIMIT 1
    `;
    if (regExists.length > 0) {
      nextIdNum++;
      continue;
    }

    // Check pending_employees table
    const pendingExists = await sql`
      SELECT 1 FROM pending_employees 
      WHERE registration_id = ${candidate} OR registration_id = ${candidate.toLowerCase()}
      LIMIT 1
    `;
    if (pendingExists.length > 0) {
      nextIdNum++;
      continue;
    }

    // Found a valid one!
    localUsedIds.add(candidate);
    return candidate;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Parse input (requires multipart/form-data file upload)
    const contentType = req.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      return withCors(req, { 
        success: false, 
        error: "No file uploaded. Please attach a CSV or Excel file using form-data under the 'file' key." 
      }, 400);
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!isFile(file) || file.size === 0 || !file.name || file.name.trim() === "") {
      return withCors(req, { 
        success: false, 
        error: "No file uploaded. Please attach a CSV or Excel file under the 'file' key in form-data." 
      }, 400);
    }

    let rows: Record<string, string>[] = [];
    let parsedHeaders: string[] = [];
    let text = "";
    const fileNameLower = file.name.trim().toLowerCase();

    const expectedHeaders = [
      "firstname", "first_name", "first name", 
      "surname", "last_name", "lastname", "last name",
      "email", "email_address", "emailaddress", "email address",
      "employee name", "employee_name", "employeename", "name", "fullname", "full name", "full_name",
      "staff id", "staffid", "staff_id", "employee id", "employeeid", "employee_id", "employment id", "employment_id"
    ];

    if (fileNameLower.endsWith(".csv")) {
      text = await file.text();

      if (!text || !text.trim() || text.trim() === "") {
        return withCors(req, { 
          success: false, 
          error: "CSV file is empty. Please attach a CSV file with valid employee data." 
        }, 400);
      }

      // Prevent JSON payloads from being treated as CSV
      const trimmedText = text.trim();
      if (trimmedText.startsWith("{") || trimmedText.startsWith("[")) {
        return withCors(req, {
          success: false,
          error: "Invalid file content. Request body appears to be JSON instead of CSV. Please attach a valid CSV file."
        }, 400);
      }

      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
      });

      parsedHeaders = parsed.meta.fields || [];
      rows = parsed.data as Record<string, string>[];
    } else if (fileNameLower.endsWith(".xlsx") || fileNameLower.endsWith(".xls")) {
      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          return withCors(req, {
            success: false,
            error: "Excel file is empty (has no sheets)."
          }, 400);
        }
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          return withCors(req, {
            success: false,
            error: "Failed to read Excel worksheet."
          }, 400);
        }
        
        // Parse rows
        rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Record<string, string>[];
        
        // Parse headers
        const sheetHeaderRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
        parsedHeaders = (sheetHeaderRows[0] || []).map(h => String(h || ""));
      } catch (err: any) {
        return withCors(req, {
          success: false,
          error: "Failed to parse Excel file.",
          details: err.message || String(err)
        }, 400);
      }
    } else {
      return withCors(req, {
        success: false,
        error: `Invalid file format. Please upload a CSV (.csv) or Excel (.xlsx) file. Received file: "${file.name}".`
      }, 400);
    }

    const hasValidHeader = parsedHeaders.some(h => {
      const norm = h.toLowerCase().trim().replace(/[\s_-]/g, "");
      return expectedHeaders.some(eh => eh.toLowerCase().trim().replace(/[\s_-]/g, "") === norm);
    });

    if (!hasValidHeader) {
      return withCors(req, {
        success: false,
        error: "Invalid file format. Could not find any valid employee headers (e.g. FirstName, Surname, Email). Please verify your columns.",
        debugInfo: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          contentType,
          parsedHeaders
        }
      }, 400);
    }

    if (rows.length === 0) {
      return withCors(req, { 
        success: false, 
        error: "File has no data rows. Please attach a CSV or Excel file with valid employee data." 
      }, 400);
    }

    // Upload CSV/Excel spreadsheet to Cloudinary
    let cloudinaryUrl = "";
    try {
      cloudinaryUrl = await uploadToBlob(file, file.name);
      
      // Save record in file_manager_files
      const fileId = `FI-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      await sql`
        INSERT INTO file_manager_files (
          file_id, name, folder_id, file_url, file_type, file_size, uploaded_by, status, employee_id, created_at, updated_at
        )
        VALUES (
          ${fileId}, ${file.name}, NULL, ${cloudinaryUrl}, ${file.type || "text/csv"}, ${file.size}, 'admin_import', 'Approved', NULL, NOW(), NOW()
        )
      `;
    } catch (uploadErr: any) {
      console.error("Cloudinary upload failed during import:", uploadErr);
      return withCors(req, {
        success: false,
        error: "Failed to upload imported file to Cloudinary storage.",
        details: uploadErr.message || String(uploadErr)
      }, 500);
    }

    const insertedEmployees = [];
    const failedRows = [];
    const localUsedIds = new Set<string>();
    let rowIndex = 0;

    for (const row of rows) {
      rowIndex++;
      try {
        // Retrieve and normalize fields
        const rawRegistrationId = getRowValue(row, ["EmploymentIdNo", "employment_id_no", "Employee ID", "EmployeeID", "Staff ID", "staff_id"]);
        let surname = getRowValue(row, ["Surname", "surname", "Last Name", "lastname", "last_name"]);
        let firstname = getRowValue(row, ["FirstName", "firstname", "First Name", "first_name"]);
        const employeeName = getRowValue(row, ["Employee Name", "employee_name", "employeename", "Name", "name", "Full Name", "fullname", "full_name"]);

        // Perform name splitting if separate first name/surname are missing or empty
        if ((!firstname || !surname) && employeeName) {
          const tokens = employeeName.trim().split(/\s+/);
          if (tokens.length > 0) {
            if (!surname) {
              surname = tokens[0] || "";
            }
            if (!firstname) {
              firstname = tokens.slice(1).join(" ");
            }
          }
        }

        // Determine / Generate Registration ID early
        let registrationId = "";
        if (rawRegistrationId) {
          registrationId = canonicalizeRegistrationId(rawRegistrationId);
          // Check for registrationId duplicates
          const regExists = await sql`
            SELECT 1 FROM registrations WHERE registration_id = ${registrationId} LIMIT 1
          `;
          const pendingExists = await sql`
            SELECT 1 FROM pending_employees WHERE registration_id = ${registrationId} LIMIT 1
          `;
          if (regExists.length > 0 || pendingExists.length > 0 || localUsedIds.has(registrationId)) {
            throw new Error(`Registration ID "${registrationId}" is already in use.`);
          }
          localUsedIds.add(registrationId);
        } else {
          registrationId = await generateImportRegistrationId(localUsedIds);
        }

        // Email fallback generation using registrationId
        let email = getRowValue(row, ["Email", "email", "Email Address", "email_address"]).trim();
        if (!email) {
          email = `${registrationId.toLowerCase()}@npf.gov.ng`;
        }

        const extracted = {
          registrationId,
          surname,
          firstname,
          email,
          department: getRowValue(row, ["Department", "department", "dept", "Unit", "unit"]),
          position: getRowValue(row, ["Position", "position", "RankPosition", "rank_position", "Job Title", "job_title"]),
          hire_date: getRowValue(row, ["HireDate", "hire_date", "Date of First Appointment", "date_of_first_appointment", "DateOfFirstAppointment", "Hire Date"]),
          date_of_birth: getRowValue(row, ["Date of Birth", "date_of_birth", "DateOfBirth", "dob", "DOB"]),
          marital_status: getRowValue(row, ["Marital Status", "marital_status", "MaritalStatus"]),
          gender: getRowValue(row, ["Gender", "gender", "Sex", "sex"]),
          state_of_origin: getRowValue(row, ["State of Origin", "state_of_origin", "StateOfOrigin"]),
          lga_origin: getRowValue(row, ["LGA of Origin", "lga_origin", "LGAOfOrigin", "LGA", "lga"]),
          job_title: getRowValue(row, ["Job Title", "job_title", "RankPosition", "rank_position", "Position", "position"]),
          assignment_status: getRowValue(row, ["Assignment Status", "assignment_status", "AssignmentStatus", "Employee Status", "employee_status"]),
          location: getRowValue(row, ["Location", "location", "Work Location", "work_location", "WorkLocation"]),
          zone: getRowValue(row, ["Zone", "zone"]),
          supervisor: getRowValue(row, ["Supervisor", "supervisor"]),
          command: getRowValue(row, ["Command", "command"]),
          grade_category: getRowValue(row, ["Grade Category", "grade_category", "GradeCategory", "Cadre", "cadre"]),
          grade: getRowValue(row, ["Grade", "grade", "GL", "gl", "Grade Level", "grade_level"]),
          step: getRowValue(row, ["Step", "step"]),
          salary: getRowValue(row, ["Salary", "salary", "Basic Salary", "basic_salary"]),
          residence_address: getRowValue(row, ["Residence Address", "residence_address", "ResidenceAddress", "Residential Address", "residential_address", "AddressStateOfResidence", "State of Residence", "state_of_residence"]),
          contact_address: getRowValue(row, ["Contact Address", "contact_address", "ContactAddress"]),
          telephone_number: getRowValue(row, ["Telephone Number", "telephone_number", "TelephoneNumber", "Phone Number", "phone_number", "PhoneNumber", "phone", "Phone"]),
          nationality: getRowValue(row, ["Nationality", "nationality"]),
          bank_name: getRowValue(row, ["Bank Name", "bank_name", "BankName", "Name of Bank", "name_of_bank", "NameOfBank"]),
          sort_code: getRowValue(row, ["Sort Code", "sort_code", "SortCode"]),
          account_number: getRowValue(row, ["Account Number", "account_number", "AccountNumber", "Account No", "account_no"]),
          pfa_name: getRowValue(row, ["PFA Name", "pfa_name", "PFAName", "Pension Administrator", "pension_administrator"]),
          pin_number: getRowValue(row, ["Pin Number", "pin_number", "PinNumber", "RSA PIN", "rsa_pin", "RSAPIN"]),
          payroll_group: getRowValue(row, ["Payroll Group", "payroll_group", "PayrollGroup"]),
          staff_category: getRowValue(row, ["Staff Category", "staff_category", "StaffCategory"]),
          date_terminated: getRowValue(row, ["Date Terminated", "date_terminated", "DateTerminated"]),
          legacy_id: getRowValue(row, ["Legacy ID", "legacy_id", "LegacyID"]),
          assignment_start_date: getRowValue(row, ["Assignment Start Date", "assignment_start_date", "AssignmentStartDate"]),
          person_start_date: getRowValue(row, ["Person Start Date", "person_start_date", "PersonStartDate"]),
          date_of_last_promotion: getRowValue(row, ["Date of Last Promotion", "date_of_last_promotion", "DateOfLastPromotion"]),
          unit: getRowValue(row, ["Unit", "unit", "Department", "department"]),
          organization_name: getRowValue(row, ["Organization Name", "organization_name", "OrganizationName", "Organization", "organization"]),
          employee_type: getRowValue(row, ["Employee Type", "employee_type", "EmployeeType", "Employment Type", "employment_type"]),
          bvn: getRowValue(row, ["Bvn", "bvn", "BVN"]),
          tax_id: getRowValue(row, ["Tax Id", "tax_id", "TaxID", "Tax ID"]),
          nin: getRowValue(row, ["NIN", "nin", "NIN Number", "nin_number", "NINNumber"]),
          ninVerifiedCsvFlag: getRowValue(row, ["NIN Verified", "nin_verified", "NINVerified"])
        };

        // Core validations
        if (!extracted.firstname || !extracted.surname || !extracted.email) {
          throw new Error("Missing required core fields: first name, surname, and email are all required.");
        }

        // Email duplicate checks
        const pendingEmailExists = await sql`
          SELECT 1 FROM pending_employees WHERE LOWER(email) = ${extracted.email.toLowerCase()} LIMIT 1
        `;
        if (pendingEmailExists.length > 0) {
          throw new Error(`Email "${extracted.email}" is already registered as a pending employee.`);
        }

        const activeEmailExists = await sql`
          SELECT 1 FROM employees WHERE LOWER(email) = ${extracted.email.toLowerCase()} LIMIT 1
        `;
        if (activeEmailExists.length > 0) {
          throw new Error(`Email "${extracted.email}" is already registered to an active employee.`);
        }

        // NIN validation status
        let ninVerified = false;
        if (extracted.ninVerifiedCsvFlag.toLowerCase() === "true" || extracted.ninVerifiedCsvFlag.toLowerCase() === "yes") {
          ninVerified = true;
        }

        let systemVerifiedNinData = null;
        if (extracted.nin) {
          const vdResult = await sql`
            SELECT firstname, surname FROM "VerificationData"
            WHERE nin = ${extracted.nin}
            LIMIT 1
          `;
          if (vdResult.length > 0) {
            ninVerified = true;
            systemVerifiedNinData = vdResult[0];
          }
        }

        let ninStatus = "";
        if (!extracted.nin) {
          ninStatus = "NIN is missing";
        } else if (ninVerified) {
          ninStatus = "NIN is submitted and verified";
        } else {
          ninStatus = "NIN is submitted but not verified";
        }

        // BVN validation status
        let bvnStatus = "";
        if (!extracted.bvn) {
          bvnStatus = "BVN is missing";
        } else {
          bvnStatus = "BVN is submitted";
        }

        // Name tally check
        let nameTallyStatus = "Cannot verify name (NIN not verified)";
        if (ninVerified && systemVerifiedNinData) {
          const vdFirst = (systemVerifiedNinData.firstname || "").toLowerCase().trim();
          const vdSurname = (systemVerifiedNinData.surname || "").toLowerCase().trim();
          const rowFirst = (extracted.firstname || "").toLowerCase().trim();
          const rowSurname = (extracted.surname || "").toLowerCase().trim();
          
          if (!rowFirst && !rowSurname) {
            nameTallyStatus = "Mismatch (No name provided in CSV)";
          } else if (vdFirst === rowFirst && vdSurname === rowSurname) {
            nameTallyStatus = "Matches";
          } else if (vdFirst === rowSurname && vdSurname === rowFirst) {
            nameTallyStatus = "Matches (First/Surname order swapped)";
          } else {
            // Check if names share core words
            const vdWords = new Set(`${vdFirst} ${vdSurname}`.split(/\s+/).filter(Boolean));
            const rowWords = new Set(`${rowFirst} ${rowSurname}`.split(/\s+/).filter(Boolean));
            
            let intersection = 0;
            for (const w of rowWords) {
              if (vdWords.has(w)) intersection++;
            }
            
            if (intersection > 0 && intersection === vdWords.size && intersection === rowWords.size) {
              nameTallyStatus = "Matches";
            } else if (intersection > 0) {
              nameTallyStatus = `Partial Match (CSV: "${rowFirst} ${rowSurname}" vs NIN: "${vdFirst} ${vdSurname}")`;
            } else {
              nameTallyStatus = `Mismatch (CSV: "${rowFirst} ${rowSurname}" vs NIN: "${vdFirst} ${vdSurname}")`;
            }
          }
        } else if (ninVerified) {
          nameTallyStatus = "N/A (NIN verified via CSV flag only)";
        } else if (extracted.nin) {
          nameTallyStatus = "Cannot verify name (NIN is submitted but not verified)";
        } else {
          nameTallyStatus = "Cannot check name tally (NIN is missing)";
        }

        // Core profile data fields for completeness checking
        const employeeDataForCompleteness = {
          firstname: extracted.firstname,
          surname: extracted.surname,
          email: extracted.email,
          telephone_number: extracted.telephone_number,
          gender: extracted.gender,
          date_of_birth: extracted.date_of_birth,
          marital_status: extracted.marital_status,
          state_of_origin: extracted.state_of_origin,
          lga_origin: extracted.lga_origin,
          residence_address: extracted.residence_address,
          hire_date: extracted.hire_date,
          job_title: extracted.job_title,
          location: extracted.location,
          command: extracted.command,
          grade: extracted.grade,
          step: extracted.step,
          salary: extracted.salary,
          bank_name: extracted.bank_name,
          account_number: extracted.account_number,
          pfa_name: extracted.pfa_name
        };

        const completeness = calculateCompleteness(employeeDataForCompleteness);

        const validationSummary = `Profile is ${completeness.percentage}% complete. ` + 
          `${ninStatus}. ` + 
          `${bvnStatus}. ` +
          `Name check: ${nameTallyStatus}.`;

        const validation = {
          profileCompleteness: completeness.percentage,
          profileCompletenessMessage: `Profile is ${completeness.percentage}% complete (${100 - completeness.percentage}% remaining)`,
          missingFields: completeness.missing,
          ninSubmitted: Boolean(extracted.nin),
          ninVerified: ninVerified,
          ninStatus: ninStatus,
          bvnSubmitted: Boolean(extracted.bvn),
          bvnStatus: bvnStatus,
          nameTallyStatus: nameTallyStatus,
          validationSummary: validationSummary
        };

        // Prepare JSON metadata representation
        const jsonData = { ...row, "BVN Verified": row["BVN Verified"] || null, "NIN Verified": row["NIN Verified"] || null };

        // Insert into pending_employees using the SQL driver
        const result = await sql`
          INSERT INTO pending_employees (
            registration_id,
            surname,
            firstname,
            email,
            department,
            position,
            status,
            source,
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
            created_at,
            updated_at,
            metadata,
            missing_fields
          ) VALUES (
            ${registrationId},
            ${extracted.surname},
            ${extracted.firstname},
            ${extracted.email},
            ${extracted.department || null},
            ${extracted.position || null},
            'pending_approval',
            'import',
            ${parseDate(extracted.hire_date)},
            ${parseDate(extracted.date_of_birth)},
            ${extracted.marital_status || null},
            ${extracted.gender || null},
            ${extracted.state_of_origin || null},
            ${extracted.lga_origin || null},
            ${extracted.job_title || null},
            ${extracted.assignment_status || null},
            ${extracted.location || null},
            ${extracted.zone || null},
            ${extracted.supervisor || null},
            ${extracted.command || null},
            ${extracted.grade_category || null},
            ${extracted.grade || null},
            ${extracted.step || null},
            ${parseDecimal(extracted.salary)},
            ${extracted.residence_address || null},
            ${extracted.contact_address || null},
            ${extracted.telephone_number || null},
            ${extracted.nationality || null},
            ${extracted.bank_name || null},
            ${extracted.sort_code || null},
            ${extracted.account_number || null},
            ${extracted.pfa_name || null},
            ${extracted.pin_number || null},
            ${extracted.payroll_group || null},
            ${extracted.staff_category || null},
            ${parseDate(extracted.date_terminated)},
            ${extracted.legacy_id || null},
            ${parseDate(extracted.assignment_start_date)},
            ${parseDate(extracted.person_start_date)},
            ${parseDate(extracted.date_of_last_promotion)},
            ${extracted.unit || null},
            ${extracted.organization_name || null},
            ${extracted.employee_type || null},
            ${extracted.bvn || null},
            ${extracted.tax_id || null},
            NOW(),
            NOW(),
            ${JSON.stringify(jsonData)},
            ${JSON.stringify(validation)}
          )
          RETURNING *
        `;

        insertedEmployees.push({
          rowNumber: rowIndex,
          registrationId,
          name: `${extracted.firstname} ${extracted.surname}`,
          email: extracted.email,
          employee: result[0],
          validationStatus: validation
        });
      } catch (err: any) {
        failedRows.push({
          rowNumber: rowIndex,
          email: row.Email || row.email || "Unknown",
          error: err.message || String(err),
          debugRowKeys: Object.keys(row),
          debugRowSample: JSON.stringify(row).slice(0, 300)
        });
      }
    }

    return withCors(req, {
      success: true,
      message: `Bulk import completed: ${insertedEmployees.length} imported successfully, ${failedRows.length} failed.`,
      fileUrl: cloudinaryUrl,
      summary: {
        totalRows: rows.length,
        successful: insertedEmployees.length,
        failed: failedRows.length
      },
      data: insertedEmployees,
      errors: failedRows
    });

  } catch (error) {
    console.error("CSV import error:", error);
    return withCors(req, {
      success: false,
      error: "Failed to import pending employees",
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
}

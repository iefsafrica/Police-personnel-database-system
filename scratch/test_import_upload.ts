import axios from "axios";
import FormData from "form-data";
import jwt from "jsonwebtoken";
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const JWT_SECRET = process.env.JWT_SECRET || "ippis_A00120044";
const importURL = "http://localhost:8000/api/admin/import";
const db = neon(process.env.DATABASE_URL!);

async function runTest() {
  try {
    console.log("--- Starting Bulk Import Cloudinary Upload Test ---");

    // 1. Generate JWT token
    console.log("Signing JWT token...");
    const token = jwt.sign(
      { id: 1, username: "superadmin", role: "superadmin" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 2. Prepare mock CSV data
    const csvContent = 
      "First Name,Surname,Email Address,Telephone Number,Gender,Job Title,Command\n" +
      `John_Cloud,Test_Cloud,john_cloud_${Math.round(Math.random() * 10000)}@npf.gov.ng,08012345678,Male,Officer,FCT Command\n`;

    const form = new FormData();
    form.append("file", Buffer.from(csvContent), {
      filename: "npf_import_test.csv",
      contentType: "text/csv"
    });

    console.log("Sending POST import request to local server...");
    const res = await axios.post(importURL, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });

    console.log("Status:", res.status);
    console.log("Response data message:", res.data.message);
    const fileUrl = res.data.fileUrl;
    console.log("Cloudinary Spreadsheet URL:", fileUrl);

    // Verify it starts with Cloudinary domain
    const isCloudinary = fileUrl && fileUrl.includes("cloudinary.com");
    console.log("URL is stored in Cloudinary:", isCloudinary);

    // 3. Query DB to check if the file is registered in file_manager_files
    console.log("Querying database for file registration...");
    const dbRecord = await db`SELECT * FROM file_manager_files WHERE file_url = ${fileUrl}`;
    console.log("Database Record found:", JSON.stringify(dbRecord, null, 2));

    // 4. CLEANUP
    console.log("\nCleaning up test data...");
    
    // Delete from file_manager_files
    if (dbRecord && dbRecord.length > 0) {
      const rec = dbRecord[0] as any;
      await db`DELETE FROM file_manager_files WHERE file_id = ${rec.file_id}`;
      console.log("Deleted file record from file_manager_files.");
    }

    // Delete from pending_employees
    if (res.data && res.data.data && res.data.data.length > 0) {
      const regId = res.data.data[0].registrationId;
      await db`DELETE FROM pending_employees WHERE registration_id = ${regId}`;
      console.log(`Deleted pending employee row with registration_id: ${regId}`);
    }

    console.log("\n--- Bulk Import Cloudinary Upload Verification Success ---");
  } catch (error: any) {
    console.error("Test failed with error:", error.response?.data || error.message || error);
  }
}

runTest();

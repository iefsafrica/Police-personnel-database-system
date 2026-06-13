import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  try {
    console.log("Altering 'employees' table to add 'verification_id' column...");
    await sql`
      ALTER TABLE employees 
      ADD COLUMN IF NOT EXISTS verification_id VARCHAR(36)
    `;
    console.log("Success! verification_id column added to employees table.");
  } catch (error) {
    console.error("Failed to alter table:", error);
  }
}

main();

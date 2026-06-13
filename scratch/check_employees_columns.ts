import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  try {
    console.log("Checking columns of 'employees' table...");
    const cols = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'employees'
      ORDER BY ordinal_position;
    `;
    console.log("Employees table columns:", JSON.stringify(cols, null, 2));
  } catch (error) {
    console.error("DB Query failed:", error);
  }
}

main();

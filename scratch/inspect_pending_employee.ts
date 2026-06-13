import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  try {
    console.log("Fetching pending employees...");
    const rows = await sql`SELECT id, registration_id, firstname, surname, email, department, position FROM pending_employees`;
    console.log("Pending employees:", JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error("DB Query failed:", error);
  }
}

main();

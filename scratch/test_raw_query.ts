import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function test() {
  try {
    const ids = ["PF0033406", "PF0202767"];
    console.log("Checking if they are still in pending_employees...");
    const pending = await sql`
      SELECT id, registration_id FROM pending_employees 
      WHERE registration_id IN (${ids[0]}, ${ids[1]})
    `;
    console.log("Pending:", pending);

    console.log("Checking if they are in employees...");
    const active = await sql`
      SELECT id, name, email, department, position, status FROM employees 
      WHERE registration_id IN (${ids[0]}, ${ids[1]})
    `;
    console.log("Active Employees:", active);
  } catch (error) {
    console.error("Query failed:", error);
  }
}

test();

import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  try {
    const rows = await sql`SELECT * FROM pending_employees LIMIT 1`;
    console.log("Full pending employee:", JSON.stringify(rows[0], null, 2));
  } catch (error) {
    console.error("DB Query failed:", error);
  }
}

main();

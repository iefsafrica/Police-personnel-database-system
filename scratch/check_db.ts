import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  try {
    console.log("Cleaning up test registration record 'NPF-0005'...");
    const deleted = await sql`
      DELETE FROM registrations
      WHERE registration_id = 'NPF-0005'
      RETURNING id, registration_id
    `;
    console.log("Successfully deleted registrations:", JSON.stringify(deleted, null, 2));
  } catch (error) {
    console.error("Cleanup failed:", error);
  }
}

main();

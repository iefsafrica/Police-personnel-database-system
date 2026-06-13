import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  try {
    console.log("Updating superadmin email in DB...");
    const result = await sql`
      UPDATE admin_users
      SET email = 'iefsafrica@gmail.com'
      WHERE username = 'superadmin' OR email = 'iesafrica@gmail.com'
      RETURNING id, username, email, role;
    `;
    console.log("Update result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("DB Update failed:", error);
  }
}

main();

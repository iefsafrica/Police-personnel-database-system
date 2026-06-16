import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function test() {
  try {
    console.log("Checking admin users...");
    const admins = await sql`SELECT id, username, email, role, is_active FROM admin_users`;
    console.log("Admins:", JSON.stringify(admins, null, 2));
  } catch (error) {
    console.error("Database query failed:", error);
  }
}

test();

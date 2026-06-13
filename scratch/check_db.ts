import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  try {
    console.log("Connecting to DB...");
    const users = await sql`SELECT id, username, email, role, is_active FROM admin_users`;
    console.log("Current admin users in DB:", JSON.stringify(users, null, 2));

    const permissions = await sql`SELECT role, resource, action, is_allowed FROM admin_permissions`;
    console.log("Current permissions in DB:", JSON.stringify(permissions, null, 2));
  } catch (error) {
    console.error("DB Query failed:", error);
  }
}

main();

import { neon } from "@neondatabase/serverless";
import { NextRequest } from "next/server";
import { withCors, handleOptions } from "@/lib/cors";

const sql = neon(process.env.DATABASE_URL!);

export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function GET(req: NextRequest) {
  try {
    // Double check user role (enforced by middleware, but check here for defence in depth)
    const userRole = req.headers.get("x-user-role");
    if (userRole !== "superadmin") {
      return withCors(req, { success: false, error: "Access denied: Super Admin privilege required." }, 403);
    }

    // 1️⃣ Fetch database metrics and record counts
    const tableCounts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM admin_users) as total_admins,
        (SELECT COUNT(*) FROM admin_sessions) as active_sessions,
        (SELECT COUNT(*) FROM employees) as total_employees,
        (SELECT COUNT(*) FROM pending_employees) as pending_employees
    `;

    // 2️⃣ Fetch administrators registry list
    const adminUsersSummary = await sql`
      SELECT id, username, email, role, is_active, last_login, created_at
      FROM admin_users
      ORDER BY id ASC
    `;

    // 3️⃣ Configuration environment diagnostics
    const configStatus = {
      databaseEngine: "PostgreSQL (Neon Serverless)",
      jwtAlgorithm: "HS256",
      otpEnabled: true,
      environment: process.env.NODE_ENV || "development"
    };

    return withCors(req, {
      success: true,
      data: {
        stats: {
          totalAdmins: Number(tableCounts[0]?.total_admins ?? 0),
          activeSessions: Number(tableCounts[0]?.active_sessions ?? 0),
          totalEmployees: Number(tableCounts[0]?.total_employees ?? 0),
          pendingEmployees: Number(tableCounts[0]?.pending_employees ?? 0)
        },
        admins: adminUsersSummary,
        systemConfig: configStatus
      }
    });

  } catch (error: any) {
    console.error("GET superadmin-dashboard error:", error);
    return withCors(req, {
      success: false,
      error: "Failed to fetch superadmin dashboard data",
      details: error.message || String(error)
    }, 500);
  }
}

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
    const userIdStr = req.headers.get("x-user-id");

    if (!userIdStr) {
      return withCors(req, { success: false, error: "Unauthorized" }, 401);
    }

    const userId = parseInt(userIdStr, 10);

    // Fetch user details from database
    const userResult = await sql`
      SELECT id, username, email, full_name, role, is_active, last_login, created_at, updated_at
      FROM admin_users
      WHERE id = ${userId}
      LIMIT 1
    `;

    const user = userResult[0];
    if (!user) {
      return withCors(req, { success: false, error: "User not found" }, 404);
    }

    // Fetch user permissions based on their role
    let permissionsResult;
    if (user.role.toLowerCase() === "superadmin") {
      permissionsResult = [{ resource: "*", action: "*", is_allowed: true }];
    } else {
      permissionsResult = await sql`
        SELECT resource, action, is_allowed
        FROM admin_permissions
        WHERE LOWER(role) = ${user.role.toLowerCase()}
      `;
    }

    return withCors(req, {
      success: true,
      data: {
        user,
        permissions: permissionsResult
      }
    });

  } catch (error: any) {
    console.error("GET auth/me error:", error);
    return withCors(req, {
      success: false,
      error: "Failed to fetch user session",
      details: error.message || String(error)
    }, 500);
  }
}

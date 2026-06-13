import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { withCors, handleOptions } from "@/lib/cors";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL!);

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Seed Super Admin
    const superAdminEmail = "iefsafrica@gmail.com";
    const superAdminUsername = "superadmin";
    const superAdminPassword = "Admin@commisional$123";
    const superAdminFullName = "Super Admin";
    const superAdminRole = "superadmin";

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(superAdminPassword, salt);

    // Check if the superadmin already exists
    const existingSuperAdmin = await sql`
      SELECT id FROM admin_users 
      WHERE email = ${superAdminEmail} OR username = ${superAdminUsername}
      LIMIT 1
    `;

    let userResult;
    if (existingSuperAdmin.length > 0) {
      // Update password hash just in case
      userResult = await sql`
        UPDATE admin_users
        SET password_hash = ${passwordHash}, role = ${superAdminRole}, full_name = ${superAdminFullName}, is_active = true, updated_at = NOW()
        WHERE id = ${existingSuperAdmin[0]!.id}
        RETURNING id, username, email, full_name, role, is_active
      `;
    } else {
      userResult = await sql`
        INSERT INTO admin_users (username, email, password_hash, full_name, role, is_active, created_at, updated_at)
        VALUES (${superAdminUsername}, ${superAdminEmail}, ${passwordHash}, ${superAdminFullName}, ${superAdminRole}, true, NOW(), NOW())
        RETURNING id, username, email, full_name, role, is_active
      `;
    }

    // 2️⃣ Seed Default Permissions in admin_permissions
    const permissionsToSeed = [
      // Superadmin permissions
      { role: "superadmin", resource: "*", action: "*", is_allowed: true },

      // HR Admin permissions
      { role: "admin", resource: "employees", action: "*", is_allowed: true },
      { role: "admin", resource: "payroll", action: "*", is_allowed: true },
      { role: "admin", resource: "recruitment", action: "*", is_allowed: true },
      { role: "admin", resource: "documents", action: "*", is_allowed: true },
      { role: "admin", resource: "dashboard", action: "read", is_allowed: true },

      // Zone / Command Commander permissions
      { role: "commander", resource: "employees", action: "read", is_allowed: true },
      { role: "commander", resource: "transfers", action: "*", is_allowed: true },
      { role: "commander", resource: "warnings", action: "*", is_allowed: true },
      { role: "commander", resource: "dashboard", action: "read", is_allowed: true },

      // Officer / User permissions
      { role: "officer", resource: "profile", action: "*", is_allowed: true }
    ];

    for (const perm of permissionsToSeed) {
      await sql`
        INSERT INTO admin_permissions (role, resource, action, is_allowed, created_at, updated_at)
        VALUES (${perm.role}, ${perm.resource}, ${perm.action}, ${perm.is_allowed}, NOW(), NOW())
        ON CONFLICT (role, resource, action) 
        DO UPDATE SET is_allowed = EXCLUDED.is_allowed, updated_at = NOW()
      `;
    }

    return withCors(req, {
      success: true,
      message: "Database initialized successfully. Super Admin seeded and default permissions configured.",
      data: {
        superAdmin: userResult[0],
        permissionsCount: permissionsToSeed.length
      }
    });

  } catch (error: any) {
    console.error("Database initialization failed:", error);
    return withCors(req, {
      success: false,
      error: "Failed to initialize database",
      details: error.message || String(error)
    }, 500);
  }
}

export async function GET(req: NextRequest) {
  // Let GET do the same setup for convenience in browser verification
  return POST(req);
}

import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { withCors, handleOptions } from "@/lib/cors";

const sql = neon(process.env.DATABASE_URL!);

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function GET(req: NextRequest) {
  return withCors(req, {
    endpoint: '/admin/clear-all-data',
    status: 'active',
    message: 'Send a DELETE request to clear all employee data.',
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  return withCors(req, {
    endpoint: '/admin/clear-all-data',
    message: 'POST is not supported on this endpoint. Use DELETE to clear data.'
  }, 405);
}

export async function PUT(req: NextRequest) {
  return withCors(req, {
    endpoint: '/admin/clear-all-data',
    message: 'PUT is not supported on this endpoint. Use DELETE to clear data.'
  }, 405);
}

export async function DELETE(req: NextRequest) {
  try {
    console.log("⚡ Executing database clear-all-data via API...");

    // Delete payments and budgets
    const delPayments = await sql`DELETE FROM employee_payments RETURNING id`;
    const delBudgets = await sql`DELETE FROM salary_budget RETURNING id`;

    // Delete active employees (cascades to promotions, awards, travel, transfers, resignations)
    const delActive = await sql`DELETE FROM employees RETURNING id`;

    // Delete registrations (cascades to personal_info, employment_info, VerificationData, document_uploads, comments, history)
    const delRegs = await sql`DELETE FROM registrations RETURNING id`;

    // Delete pending_employees
    const delPending = await sql`DELETE FROM pending_employees RETURNING id`;

    return withCors(req, {
      success: true,
      message: "Database cleared of all employee data successfully.",
      summary: {
        deletedActive: delActive.length,
        deletedPending: delPending.length,
        deletedRegistrations: delRegs.length,
        deletedPayments: delPayments.length,
        deletedBudgets: delBudgets.length,
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("❌ Failed to clear database via API:", error);
    return withCors(req, {
      success: false,
      error: "Failed to clear all employee data from the database.",
      details: error.message || String(error)
    }, 500);
  }
}

import { neon } from "@neondatabase/serverless";
import { withCors, handleOptions } from "@/lib/cors";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL!);

// Handle CORS preflight
export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

// GET: return status / count of pending employees
export async function GET(req: NextRequest) {
  try {
    const countResult = await sql`SELECT COUNT(*) AS total FROM pending_employees`;
    const total = Number(countResult[0]?.total ?? 0);

    return withCors(req, {
      success: true,
      message: "Pending employees count retrieved.",
      total,
    });
  } catch (error) {
    return withCors(req, {
      success: false,
      error: "Failed to retrieve pending employees count.",
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
}

// POST: clear all pending employees (or filter by source)
export async function POST(req: NextRequest) {
  return clearPendingEmployees(req);
}

// DELETE: clear all pending employees (or filter by source)
export async function DELETE(req: NextRequest) {
  return clearPendingEmployees(req);
}

async function clearPendingEmployees(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    // Optional: ?source=import  to only delete entries from a specific source
    const source = searchParams.get("source");

    let deletedCount = 0;

    if (source) {
      // Delete only rows that match the given source (e.g. "import", "form")
      const result = await sql`
        DELETE FROM pending_employees
        WHERE source = ${source}
        RETURNING id
      `;
      deletedCount = result.length;

      return withCors(req, {
        success: true,
        message: `Cleared ${deletedCount} pending employee(s) with source "${source}".`,
        deleted: deletedCount,
        source,
      });
    } else {
      // Delete ALL pending employees
      const result = await sql`
        DELETE FROM pending_employees
        RETURNING id
      `;
      deletedCount = result.length;

      return withCors(req, {
        success: true,
        message: `All pending employees cleared. ${deletedCount} record(s) deleted.`,
        deleted: deletedCount,
      });
    }
  } catch (error) {
    console.error("Error clearing pending employees:", error);
    return withCors(req, {
      success: false,
      error: "Failed to clear pending employees.",
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
}

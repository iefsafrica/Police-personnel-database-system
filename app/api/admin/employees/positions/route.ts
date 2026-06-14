import { neon } from "@neondatabase/serverless";
import { withCors, handleOptions } from "@/lib/cors";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL!);

// Helper: check if a table exists
async function tableExists(tableName: string) {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
      )
    `;
    return result[0]?.exists ?? false;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

// OPTIONS: Handle CORS preflight
export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

// GET: Fetch distinct positions of active employees
export async function GET(req: NextRequest) {
  try {
    console.log("🔍 Fetching distinct employee positions...");

    // Check if employees table exists
    const exists = await tableExists("employees");
    if (!exists) {
      return withCors(
        req,
        {
          success: false,
          error: "The 'employees' table does not exist in the database.",
        },
        404
      );
    }

    // Query distinct positions along with the count of active employees in each
    const positionCounts = await sql`
      SELECT position, COUNT(*) as count
      FROM employees
      WHERE status = 'active' AND position IS NOT NULL AND TRIM(position) != ''
      GROUP BY position
      ORDER BY count DESC, position ASC
    `;

    // Extract flat array of positions
    const positionsList = positionCounts.map((row: any) => row.position);

    return withCors(req, {
      success: true,
      data: {
        positions: positionsList,
        distribution: positionCounts.map((row: any) => ({
          position: row.position,
          count: Number(row.count),
        })),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching employee positions:", error);
    return withCors(
      req,
      {
        success: false,
        error: "Failed to fetch employee positions from database.",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}

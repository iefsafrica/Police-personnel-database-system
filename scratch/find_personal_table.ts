import { neon } from "@neondatabase/serverless";

const DATABASE_URL =
  "postgresql://neondb_owner:npg_1H6BjrQwqOhN@ep-blue-dew-ahyxzyyo.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=30";

const sql = neon(DATABASE_URL);

async function main() {
  // List ALL public tables and their row counts
  const tables = await sql`
    SELECT
      t.table_name,
      (
        SELECT reltuples::bigint
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = t.table_name
      ) AS approx_rows
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name
  `;

  console.log("\n📋 All tables in database:");
  tables.forEach((t) =>
    console.log(`  - ${t.table_name}  (~${t.approx_rows ?? 0} rows)`)
  );

  // Find tables with "personal" in name
  const personalTables = tables.filter((t) =>
    t.table_name.toLowerCase().includes("personal")
  );

  if (personalTables.length === 0) {
    console.log('\n⚠️  No table found with "personal" in the name.');
    console.log("Please check the list above and tell me the exact table name.");
    return;
  }

  console.log(`\n🔍 Found ${personalTables.length} matching table(s):`);
  personalTables.forEach((t) => console.log(`  ✅ ${t.table_name}`));
}

main().catch((err) => {
  console.error("❌ Error:", err.message || err);
  process.exit(1);
});

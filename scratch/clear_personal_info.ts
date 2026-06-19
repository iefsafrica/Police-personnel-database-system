import { neon } from "@neondatabase/serverless";

const DATABASE_URL =
  "postgresql://neondb_owner:npg_1H6BjrQwqOhN@ep-blue-dew-ahyxzyyo.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=30";

const sql = neon(DATABASE_URL);

async function main() {
  // 1. Count before
  const before = await sql`SELECT COUNT(*) AS total FROM personal_info`;
  const totalBefore = Number(before[0]?.total ?? 0);
  console.log(`\n📊 personal_info rows BEFORE clear: ${totalBefore}`);

  if (totalBefore === 0) {
    console.log("✅ Table is already empty. Nothing to delete.");
    return;
  }

  // 2. Clear all rows
  console.log(`\n🗑️  Deleting ${totalBefore} record(s)...`);
  const deleted = await sql`DELETE FROM personal_info RETURNING id`;
  console.log(`✅ Deleted ${deleted.length} record(s).`);

  // 3. Confirm
  const after = await sql`SELECT COUNT(*) AS total FROM personal_info`;
  const totalAfter = Number(after[0]?.total ?? 0);
  console.log(`\n📊 personal_info rows AFTER clear: ${totalAfter}`);
  console.log(totalAfter === 0 ? "✅ Table is now empty." : "⚠️ Some rows remain.");
}

main().catch((err) => {
  console.error("❌ Error:", err.message || err);
  process.exit(1);
});

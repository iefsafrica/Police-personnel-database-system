import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log("⚡ Connecting to database to clear all employee data...");

  try {
    // 1. Get counts before deletion
    const pendingCount = await sql`SELECT COUNT(*) AS total FROM pending_employees`;
    const activeCount = await sql`SELECT COUNT(*) AS total FROM employees`;
    const regCount = await sql`SELECT COUNT(*) AS total FROM registrations`;
    const personalCount = await sql`SELECT COUNT(*) AS total FROM personal_info`;
    const employmentCount = await sql`SELECT COUNT(*) AS total FROM employment_info`;
    const verificationCount = await sql`SELECT COUNT(*) AS total FROM "VerificationData"`;
    const paymentCount = await sql`SELECT COUNT(*) AS total FROM employee_payments`;
    const budgetCount = await sql`SELECT COUNT(*) AS total FROM salary_budget`;

    console.log("\n📊 CURRENT COUNTS:");
    console.log(`- Active Employees: ${activeCount[0].total}`);
    console.log(`- Pending Employees: ${pendingCount[0].total}`);
    console.log(`- Registrations: ${regCount[0].total}`);
    console.log(`- Personal Info records: ${personalCount[0].total}`);
    console.log(`- Employment Info records: ${employmentCount[0].total}`);
    console.log(`- Verification Data records: ${verificationCount[0].total}`);
    console.log(`- Employee Payments: ${paymentCount[0].total}`);
    console.log(`- Salary Budgets: ${budgetCount[0].total}`);

    console.log("\n🗑️  Starting deletion process...");

    // Delete child and related payments/budgets
    const delPayments = await sql`DELETE FROM employee_payments RETURNING id`;
    console.log(`✅ Deleted ${delPayments.length} employee payments.`);

    const delBudgets = await sql`DELETE FROM salary_budget RETURNING id`;
    console.log(`✅ Deleted ${delBudgets.length} salary budgets.`);

    // Delete active employees (cascades to promotions, awards, travel, transfers, resignations)
    const delActive = await sql`DELETE FROM employees RETURNING id`;
    console.log(`✅ Deleted ${delActive.length} active employees.`);

    // Delete from registrations (cascades to personal_info, employment_info, VerificationData, document_uploads, comments, history)
    const delRegs = await sql`DELETE FROM registrations RETURNING id`;
    console.log(`✅ Deleted ${delRegs.length} registrations.`);

    // Delete from pending_employees
    const delPending = await sql`DELETE FROM pending_employees RETURNING id`;
    console.log(`✅ Deleted ${delPending.length} pending employees.`);

    // 2. Verify all tables are empty
    console.log("\n🔄 Verifying table statuses...");
    const checkPending = await sql`SELECT COUNT(*) AS total FROM pending_employees`;
    const checkActive = await sql`SELECT COUNT(*) AS total FROM employees`;
    const checkRegs = await sql`SELECT COUNT(*) AS total FROM registrations`;
    const checkPersonal = await sql`SELECT COUNT(*) AS total FROM personal_info`;
    const checkVerification = await sql`SELECT COUNT(*) AS total FROM "VerificationData"`;

    console.log("\n📊 COUNTS AFTER DELETION:");
    console.log(`- Active Employees: ${checkActive[0].total}`);
    console.log(`- Pending Employees: ${checkPending[0].total}`);
    console.log(`- Registrations: ${checkRegs[0].total}`);
    console.log(`- Personal Info records: ${checkPersonal[0].total}`);
    console.log(`- Verification Data records: ${checkVerification[0].total}`);

    console.log("\n🎉 Database successfully emptied of all active and pending employee data.");
  } catch (error) {
    console.error("❌ Clear operation failed with error:", error);
  }
}

main();

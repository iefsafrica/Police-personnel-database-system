const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const db = neon(process.env.DATABASE_URL);

async function run() {
  try {
    const res = await db`SELECT registration_id FROM employees WHERE registration_id IS NOT NULL LIMIT 1`;
    console.log("RESULT:", res);
  } catch (err) {
    console.error("ERROR:", err);
  }
}

run();

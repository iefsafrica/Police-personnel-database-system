const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const db = neon(process.env.DATABASE_URL);

async function run() {
  try {
    const totalCount = await db`SELECT COUNT(*) FROM employees`;
    console.log("Total employees in DB:", totalCount[0].count);

    // Let's count by position / job_title containing 'DIG' or 'AIG'
    const digPositions = await db`
      SELECT position, job_title, COUNT(*) as count 
      FROM employees 
      WHERE position ILIKE '%DIG%' 
         OR job_title ILIKE '%DIG%' 
         OR position ILIKE '%Deputy Inspector General%' 
         OR job_title ILIKE '%Deputy Inspector General%'
      GROUP BY position, job_title
    `;
    console.log("DIG Ranks found:", digPositions);

    const aigPositions = await db`
      SELECT position, job_title, COUNT(*) as count 
      FROM employees 
      WHERE position ILIKE '%AIG%' 
         OR job_title ILIKE '%AIG%' 
         OR position ILIKE '%Assistant Inspector General%' 
         OR job_title ILIKE '%Assistant Inspector General%'
      GROUP BY position, job_title
    `;
    console.log("AIG Ranks found:", aigPositions);

    // Let's also check commands / states command count
    const commandCount = await db`
      SELECT command, COUNT(*) as count 
      FROM employees 
      GROUP BY command
    `;
    console.log("Command list/count:", commandCount.length, commandCount);
  } catch (err) {
    console.error("ERROR:", err);
  }
}

run();

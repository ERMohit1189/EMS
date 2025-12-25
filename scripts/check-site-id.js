require('dotenv').config();
const { Pool } = require('pg');

(async function(){
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      ['sites', 'site_id']
    );
    console.log('site_id column exists? rows:', res.rows.length);
    if (res.rows.length === 0) console.log('OK: site_id column not found');
    else console.log('WARNING: site_id column still present', res.rows);
  } catch (e) {
    console.error('Check failed:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
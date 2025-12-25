require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function run() {
  const migrationFile = process.argv[2];
  if (!migrationFile) {
    console.error('Usage: node run-migration.cjs <migration-sql-file>');
    process.exit(1);
  }

  const fullPath = path.resolve(process.cwd(), migrationFile);
  if (!fs.existsSync(fullPath)) {
    console.error('Migration file not found:', fullPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(fullPath, 'utf8');
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    console.error('.env must contain DATABASE_URL');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: conn });
  const client = await pool.connect();
  try {
    console.log('Applying migration:', migrationFile);
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration applied successfully. Running verification queries...');

    const res1 = await client.query("SELECT COUNT(*)::int AS missing_emp_code FROM employees WHERE emp_code IS NULL");
    const res2 = await client.query("SELECT COUNT(*)::int AS emp_code_count FROM employees WHERE emp_code ~ '^EMP[0-9]{5}$'");
    const res3 = await client.query("SELECT COALESCE(MAX((regexp_replace(emp_code,'[^0-9]','','g'))::int),0) AS max_seq FROM employees");
    const res4 = await client.query("SELECT emp_code, COUNT(*) FROM employees GROUP BY emp_code HAVING COUNT(*) > 1");

    console.log('Verification results:');
    console.log('- Employees missing emp_code:', res1.rows[0].missing_emp_code);
    console.log('- Employees with emp_code matching format EMP00001:', res2.rows[0].emp_code_count);
    console.log('- Max emp_code numeric part:', res3.rows[0].max_seq);
    if (res4.rows.length) {
      console.warn('- Duplicate emp_code values found:');
      console.table(res4.rows);
    } else {
      console.log('- No duplicate emp_code values found');
    }

    console.log('Verifying unique index existence...');
    const idx = await client.query("SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='employees' AND indexname='employees_emp_code_key'");
    console.log('- employees_emp_code_key index present:', idx.rows.length > 0);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });

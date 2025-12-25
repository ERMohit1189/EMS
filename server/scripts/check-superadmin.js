#!/usr/bin/env node
import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcrypt';
import 'dotenv/config';

const SUPERADMIN_EMAIL = 'superadmin@ems.local';
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('DATABASE_URL not set in env. Please set it to your DB connection string.');
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: dbUrl });
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT id, email, password, updated_at FROM employees WHERE email = $1 LIMIT 1', [SUPERADMIN_EMAIL]);
    if (res.rowCount === 0) {
      console.log('Superadmin row not found.');
      process.exit(0);
    }
    const row = res.rows[0];
    console.log('Superadmin row:', { id: row.id, email: row.email, updated_at: row.updated_at });
    console.log('Stored bcrypt hash:', row.password);

    const pwd = process.env.SUPERADMIN_PLAIN || process.argv[2] || null;
    if (pwd) {
      const match = await bcrypt.compare(pwd, row.password);
      console.log('bcrypt.compare result with provided plaintext:', match);
    } else {
      console.log('No plaintext provided for verification. To verify, set env SUPERADMIN_PLAIN and re-run.');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error('Error:', err); process.exit(1); });

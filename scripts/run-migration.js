#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is not set.');
    console.error('Set it and re-run: $env:DATABASE_URL = "postgresql://user:pass@host:5432/db"; node scripts/run-migration.js');
    process.exit(1);
  }

  const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error('Migrations directory not found:', migrationsDir);
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No .sql migration files found in', migrationsDir);
    process.exit(0);
  }

  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    console.log('Connected to database. Running migrations...');

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      console.log('\n--- Running', file, '---');
      const sql = fs.readFileSync(filePath, 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('Applied', file);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Failed to apply', file, '->', err.message || err);
        // stop on first failure
        throw err;
      }
    }

    console.log('\nAll migrations applied successfully.');
  } catch (err) {
    console.error('\nMigration runner failed:', err && err.stack ? err.stack : err);
    process.exitCode = 1;
  } finally {
    try { await client.end(); } catch (e) {}
  }
}

run();

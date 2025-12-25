#!/usr/bin/env node
/**
 * set-superadmin-password.js
 *
 * Usage:
 *  SUPERADMIN_PASSWORD="MySecret123!" node set-superadmin-password.js --update-dump
 *  OR: node set-superadmin-password.js --generate --update-dump
 *
 * This script:
 * - Generates a strong password if none is provided
 * - Hashes it using bcrypt (cost 10)
 * - Updates the `employees` table for superadmin@ems.local with the new hash (INSERTs if missing)
 * - Optionally updates `database_backup.sql` to replace the password hash in the COPY row
 * - Optionally writes an idempotent SQL migration file containing the UPDATE statement
 */

import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SUPERADMIN_EMAIL = 'superadmin@ems.local';
const DB_DUMP_PATH = path.resolve(process.cwd(), 'database_backup.sql');
const MIGRATION_DIR = path.resolve(process.cwd(), 'server', 'migrations');

function generatePassword(len = 16) {
  // Strong password with mixed sets
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+';
  let pw = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) pw += chars[bytes[i] % chars.length];
  return pw;
}

function usage() {
  console.log('Usage:');
  console.log('  SUPERADMIN_PASSWORD="pass" node set-superadmin-password.js [--update-dump] [--write-migration]');
  console.log('  node set-superadmin-password.js --generate [--update-dump] [--write-migration]');
}

async function main() {
  const args = process.argv.slice(2);
  const opts = {
    updateDump: args.includes('--update-dump'),
    writeMigration: args.includes('--write-migration'),
    generate: args.includes('--generate'),
  };

  let password = process.env.SUPERADMIN_PASSWORD || null;
  if (!password && opts.generate) password = generatePassword(20);
  if (!password) {
    console.error('No password provided. Either set SUPERADMIN_PASSWORD env var or use --generate.');
    usage();
    process.exit(1);
  }

  console.log('Hashing password...');
  const hash = await bcrypt.hash(password, 10);
  console.log('Password hashed (bcrypt).');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL must be set in the environment to update the DB');
  } else {
    const pool = new Pool({ connectionString: databaseUrl });
    const client = await pool.connect();
    try {
      // Try update
      const updateRes = await client.query(
        'UPDATE employees SET password = $1, updated_at = now() WHERE email = $2 RETURNING id, email',
        [hash, SUPERADMIN_EMAIL]
      );

      if (updateRes.rowCount === 0) {
        console.log('Superadmin row not found, creating a new superadmin employee...');
        const insertRes = await client.query(
          `INSERT INTO employees (name, email, password, father_name, mobile, doj, blood_group, marital_status, nominee, address, city, state, country, role, status, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, now(), now()) RETURNING id`,
          [
            'System Administrator',
            SUPERADMIN_EMAIL,
            hash,
            'System',
            '9999999999',
            new Date().toISOString().split('T')[0],
            'O+',
            'Single',
            'System Administrator',
            'System Location',
            'System',
            'System',
            'India',
            'superadmin',
            'Active',
          ]
        );
        if (insertRes.rowCount > 0) console.log('Inserted new superadmin with id:', insertRes.rows[0].id);
      } else {
        console.log('Updated existing superadmin password for', updateRes.rows[0].email);
      }
    } catch (err) {
      console.error('Database update failed:', err.message || err);
      process.exitCode = 1;
    } finally {
      client.release();
      await pool.end();
    }
  }

  if (opts.updateDump) {
    // Replace password hash in database_backup.sql (COPY data for employees)
    try {
      const dump = fs.readFileSync(DB_DUMP_PATH, 'utf8');
      const lines = dump.split(/\r?\n/);
      let changed = false;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('\t' + SUPERADMIN_EMAIL + '\t')) {
          const cols = lines[i].split('\t');
          // Find index of email then password is next column
          const emailIdx = cols.indexOf(SUPERADMIN_EMAIL);
          if (emailIdx >= 0 && emailIdx + 1 < cols.length) {
            cols[emailIdx + 1] = hash;
            lines[i] = cols.join('\t');
            changed = true;
            console.log('Updated password hash in database dump for', SUPERADMIN_EMAIL);
          }
        }
      }
      if (changed) {
        fs.writeFileSync(DB_DUMP_PATH, lines.join('\n'));
        console.log('database_backup.sql updated with new hash (make a backup before committing).');
      } else {
        console.warn('Could not find a matching COPY row for superadmin@ems.local in database_backup.sql - no changes made to dump.');
      }
    } catch (err) {
      console.error('Failed to update database dump:', err.message || err);
    }
  }

  if (opts.writeMigration) {
    try {
      if (!fs.existsSync(MIGRATION_DIR)) fs.mkdirSync(MIGRATION_DIR, { recursive: true });
      const filename = path.join(MIGRATION_DIR, `20251221_set_superadmin_password.sql`);
      const sql = `-- Idempotent migration to set superadmin password (generated)
-- Replace '<BCRYPT_HASH>' with the actual bcrypt hash if needed, or run this via the script.
\nUPDATE employees SET password = '${hash}', updated_at = now() WHERE email = '${SUPERADMIN_EMAIL}';\n`;
      fs.writeFileSync(filename, sql);
      console.log('Migration written to', filename);
    } catch (err) {
      console.error('Failed to write migration file:', err.message || err);
    }
  }

  console.log('\n=== DONE ===');
  console.log('Superadmin email:', SUPERADMIN_EMAIL);
  console.log('Plain password (copy this now):', password);
  console.log('\nImportant: Do NOT commit this plain password to version control. Remove SUPERADMIN_PASSWORD from env after use.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

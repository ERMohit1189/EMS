import { execSync } from 'child_process';
import fs from 'fs';

// Run the SQL to create leave_requests
const sql = `
CREATE TABLE IF NOT EXISTS leave_requests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR NOT NULL REFERENCES employees(id),
  leave_type VARCHAR NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL DEFAULT 1,
  status VARCHAR NOT NULL DEFAULT 'pending',
  applied_by VARCHAR NOT NULL,
  applied_at TIMESTAMP DEFAULT now(),
  approved_by VARCHAR,
  approved_at TIMESTAMP,
  approval_history TEXT,
  rejection_reason VARCHAR,
  remark TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
`;

try {
  console.log('Applying migration: create leave_requests table');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL environment variable is not set. Set it and re-run this script. Example (PowerShell): $env:DATABASE_URL = "postgresql://user:pass@host/db?sslmode=require"; node migrate_leave_requests.mjs');
    process.exit(1);
  }

  execSync(`psql "${dbUrl}" -c "${sql.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, { stdio: 'inherit' });
  console.log('Migration applied successfully');
} catch (e) {
  console.error('Migration failed:', e);
  process.exit(1);
}

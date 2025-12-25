import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    console.log('Running migration to add calculated salary fields...');

    await pool.query(`
      ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS month INTEGER DEFAULT 1;
      ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT 2025;
      ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS gross_salary DECIMAL(12,2);
      ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS per_day_salary DECIMAL(12,2);
      ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS earned_salary DECIMAL(12,2);
      ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS total_deductions DECIMAL(12,2);
      ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS net_salary DECIMAL(12,2);
      ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS total_days INTEGER;
      ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS present_days INTEGER;
      ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS half_days INTEGER;
      ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS absent_days INTEGER;
      ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS leave_days INTEGER;
      ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS working_days DECIMAL(5,2);
    `);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
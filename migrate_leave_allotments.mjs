import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_YFXE1gOniq0D@ep-muddy-grass-ae69jdp4.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require'
});

async function createLeaveAllotmentsTable() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Create leave_allotments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_allotments (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id VARCHAR NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        year INTEGER NOT NULL,
        medical_leave INTEGER NOT NULL DEFAULT 0,
        casual_leave INTEGER NOT NULL DEFAULT 0,
        earned_leave INTEGER NOT NULL DEFAULT 0,
        sick_leave INTEGER NOT NULL DEFAULT 0,
        personal_leave INTEGER NOT NULL DEFAULT 0,
        unpaid_leave INTEGER NOT NULL DEFAULT 0,
        leave_without_pay INTEGER NOT NULL DEFAULT 0,
        used_medical_leave INTEGER NOT NULL DEFAULT 0,
        used_casual_leave INTEGER NOT NULL DEFAULT 0,
        used_earned_leave INTEGER NOT NULL DEFAULT 0,
        used_sick_leave INTEGER NOT NULL DEFAULT 0,
        used_personal_leave INTEGER NOT NULL DEFAULT 0,
        used_unpaid_leave INTEGER NOT NULL DEFAULT 0,
        used_leave_without_pay INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, year)
      );
    `);

    console.log('Table leave_allotments created successfully!');

    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_leave_employee_year 
      ON leave_allotments(employee_id, year);
    `);

    console.log('Index created successfully!');
    
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    await client.end();
  }
}

createLeaveAllotmentsTable();

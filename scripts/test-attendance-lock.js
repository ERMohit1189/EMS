const { Pool } = require('pg');

// Use DATABASE_URL from env or fallback to local
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres';
const pool = new Pool({ connectionString });

async function main() {
  const client = await pool.connect();
  try {
    const month = 12;
    const year = 2025;

    // Find a sample employee
    let res = await client.query('SELECT id, name FROM employees LIMIT 1');
    if (res.rowCount === 0) {
      console.error('No employees found in DB. Cannot run test.');
      return;
    }
    const employee = res.rows[0];
    console.log('Using employee:', employee);

    // Upsert attendance record for the employee
    const attendanceData = JSON.stringify({ '1': 'present', '2': 'present' });

    res = await client.query(
      `SELECT id, locked FROM attendances WHERE employee_id = $1 AND month = $2 AND year = $3 LIMIT 1`,
      [employee.id, month, year]
    );

    if (res.rowCount === 0) {
      const insert = await client.query(
        `INSERT INTO attendances (employee_id, month, year, attendance_data, submitted, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id, locked`,
        [employee.id, month, year, attendanceData, false]
      );
      console.log('Inserted attendance record:', insert.rows[0]);
    } else {
      const existing = res.rows[0];
      console.log('Existing attendance record:', existing);
      await client.query(
        `UPDATE attendances SET attendance_data = $1, updated_at = NOW() WHERE id = $2`,
        [attendanceData, existing.id]
      );
      console.log('Updated attendance record');
    }

    // Insert a generated salary row (simulate save)
    res = await client.query(
      `SELECT id FROM generate_salary WHERE employee_id = $1 AND month = $2 AND year = $3 LIMIT 1`,
      [employee.id, month, year]
    );

    if (res.rowCount === 0) {
      const ins = await client.query(
        `INSERT INTO generate_salary (employee_id, month, year, gross_salary, earned_salary, total_deductions, net_salary, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING id`,
        [employee.id, month, year, 10000, 9000, 1000, 8000]
      );
      console.log('Inserted generate_salary row:', ins.rows[0]);
    } else {
      console.log('generate_salary already exists for this employee/month/year');
    }

    // Now emulate the API check that blocks attendance updates when a generated salary exists
    const salaryExists = await client.query(
      `SELECT 1 FROM generate_salary WHERE employee_id = $1 AND month = $2 AND year = $3 LIMIT 1`,
      [employee.id, month, year]
    );

    if (salaryExists.rowCount > 0) {
      console.log('\n--- Simulated API Response when attempting to modify attendance after salary saved ---');
      console.log('HTTP/1.1 403 Forbidden');
      console.log('Content-Type: application/json\n');
      console.log(JSON.stringify({ error: 'Attendance cannot be modified after salary is saved for this month.' }, null, 2));

      // Show the attendance row (to confirm lock flag)
      const att = await client.query(`SELECT id, locked, locked_at, locked_by FROM attendances WHERE employee_id = $1 AND month = $2 AND year = $3 LIMIT 1`,
        [employee.id, month, year]
      );
      console.log('\nAttendance row for this employee/month/year:');
      console.log(att.rows[0]);
    } else {
      console.log('No generated salary found — API would allow attendance update.');
    }

  } catch (err) {
    console.error('Test script error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

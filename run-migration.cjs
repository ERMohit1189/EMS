const { Client } = require('pg');

async function runMigration() {
  const client = new Client({
    connectionString: "postgresql://neondb_owner:npg_6Q3eRmWfkFds@ep-rough-rain-ahrvhny5-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✓ Connected');

    // Step 1: Remove duplicates
    console.log('\nStep 1: Removing duplicate attendance records...');
    const deleteResult = await client.query(`
      WITH ranked_attendance AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY employee_id, month, year
            ORDER BY updated_at DESC, created_at DESC
          ) AS rn
        FROM attendances
      )
      DELETE FROM attendances
      WHERE id IN (
        SELECT id
        FROM ranked_attendance
        WHERE rn > 1
      )
    `);
    console.log(`✓ Removed ${deleteResult.rowCount} duplicate records`);

    // Step 2: Add unique constraint
    console.log('\nStep 2: Adding unique constraint...');
    try {
      await client.query(`
        ALTER TABLE attendances
        ADD CONSTRAINT unique_employee_month_year
        UNIQUE (employee_id, month, year)
      `);
      console.log('✓ Unique constraint added successfully');
    } catch (err) {
      if (err.code === '42P07') {
        console.log('⚠ Constraint already exists, skipping');
      } else {
        throw err;
      }
    }

    // Step 3: Verify constraint
    console.log('\nStep 3: Verifying constraint...');
    const verifyResult = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'attendances'
      AND constraint_name = 'unique_employee_month_year'
    `);

    if (verifyResult.rows.length > 0) {
      console.log('✓ Constraint verified:', verifyResult.rows[0]);
    } else {
      console.log('❌ Constraint not found!');
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✓ Database connection closed');
  }
}

runMigration();

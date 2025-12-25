// Update Employee Fields Migration
// Run this script: node migrate-employee-fields.js

import 'dotenv/config';
import pkg from 'pg';

const { Pool } = pkg;

async function migrateEmployeeFields() {
  let pool;
  try {
    console.log('🔄 Updating Employee Table Fields...\n');

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Make fields optional
    console.log('⏳ Making bloodGroup, maritalStatus, and nominee optional...');
    await pool.query(`
      ALTER TABLE employees 
        ALTER COLUMN blood_group DROP NOT NULL,
        ALTER COLUMN marital_status DROP NOT NULL,
        ALTER COLUMN nominee DROP NOT NULL;
    `);
    
    console.log('✅ Fields updated successfully!\n');

    // Verify changes
    console.log('🔍 Verifying changes...');
    const result = await pool.query(`
      SELECT 
        column_name, 
        is_nullable, 
        data_type 
      FROM information_schema.columns 
      WHERE table_name = 'employees' 
        AND column_name IN ('blood_group', 'marital_status', 'nominee')
      ORDER BY column_name;
    `);

    console.log('📋 Updated Fields:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    console.log('\n✅ Migration Complete! You can now create employees without these fields.\n');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration Error:', error.message);
    console.error(error);
    if (pool) await pool.end();
    process.exit(1);
  }
}

migrateEmployeeFields();

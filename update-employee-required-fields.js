// Update Employee Table - Make Only Required Fields NOT NULL
// Run this script: node update-employee-required-fields.js

import 'dotenv/config';
import pkg from 'pg';

const { Pool } = pkg;

async function updateEmployeeFields() {
  let pool;
  try {
    console.log('🔄 Updating Employee Table Required Fields...\n');

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    console.log('⏳ Updating field constraints...\n');

    // Make non-required fields nullable
    console.log('📝 Making optional fields nullable...');
    await pool.query(`
      ALTER TABLE employees 
        ALTER COLUMN address DROP NOT NULL,
        ALTER COLUMN city DROP NOT NULL,
        ALTER COLUMN state DROP NOT NULL,
        ALTER COLUMN country DROP NOT NULL,
        ALTER COLUMN ppe_kit DROP NOT NULL;
    `);
    console.log('✅ Optional fields are now nullable\n');

    // Ensure required field maritalStatus is NOT NULL
    console.log('📝 Ensuring Marital Status is required...');
    await pool.query(`
      UPDATE employees SET marital_status = 'Single' WHERE marital_status IS NULL;
      ALTER TABLE employees ALTER COLUMN marital_status SET NOT NULL;
    `);
    console.log('✅ Marital Status is now required\n');

    // Ensure required field designationId is NOT NULL
    console.log('📝 Ensuring Designation is required...');
    
    // First check if there are any NULL values
    const nullCheck = await pool.query(`
      SELECT COUNT(*) as count FROM employees WHERE designation_id IS NULL;
    `);
    
    if (parseInt(nullCheck.rows[0].count) > 0) {
      console.log(`   ⚠️  Found ${nullCheck.rows[0].count} employees without designation`);
      console.log('   ⏳ Skipping designation_id NOT NULL constraint (has NULL values)');
      console.log('   💡 Tip: Assign designations to all employees first, then run this migration again');
    } else {
      await pool.query(`
        ALTER TABLE employees ALTER COLUMN designation_id SET NOT NULL;
      `);
      console.log('✅ Designation is now required');
    }
    console.log('');

    // Verify changes
    console.log('🔍 Verifying changes...\n');
    const result = await pool.query(`
      SELECT 
        column_name, 
        is_nullable, 
        data_type 
      FROM information_schema.columns 
      WHERE table_name = 'employees' 
      ORDER BY 
        CASE 
          WHEN is_nullable = 'NO' THEN 1 
          ELSE 2 
        END,
        column_name;
    `);

    console.log('📋 REQUIRED Fields (NOT NULL):');
    result.rows
      .filter(row => row.is_nullable === 'NO')
      .forEach(row => {
        console.log(`   ✓ ${row.column_name} (${row.data_type})`);
      });

    console.log('\n📋 OPTIONAL Fields (NULLABLE):');
    result.rows
      .filter(row => row.is_nullable === 'YES')
      .forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });

    console.log('\n✅ Migration Complete!\n');
    console.log('Required Fields:');
    console.log('  1. Full Name (name)');
    console.log('  2. Father\'s Name (father_name)');
    console.log('  3. Marital Status (marital_status)');
    console.log('  4. Mobile No. (mobile)');
    console.log('  5. Email (email)');
    console.log('  6. Role (role)');
    console.log('  7. Designation (designation_id)');
    console.log('  8. Date of Joining (doj)\n');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration Error:', error.message);
    console.error(error);
    if (pool) await pool.end();
    process.exit(1);
  }
}

updateEmployeeFields();

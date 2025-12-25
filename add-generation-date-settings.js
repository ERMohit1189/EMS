// Add PO and Invoice Generation Date Settings
// Run this script: node add-generation-date-settings.js

import 'dotenv/config';
import pkg from 'pg';

const { Pool } = pkg;

async function addGenerationDateSettings() {
  let pool;
  try {
    console.log('🔄 Adding PO and Invoice Generation Date Settings...\n');

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Add new columns
    console.log('⏳ Adding new columns to app_settings table...');
    await pool.query(`
      ALTER TABLE app_settings 
        ADD COLUMN IF NOT EXISTS po_generation_date INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS invoice_generation_date INTEGER DEFAULT 1;
    `);
    console.log('✅ Columns added successfully\n');

    // Initialize default values if no settings exist
    console.log('⏳ Checking for existing settings...');
    const checkResult = await pool.query('SELECT COUNT(*) as count FROM app_settings');
    
    if (parseInt(checkResult.rows[0].count) === 0) {
      console.log('📝 Creating default settings...');
      await pool.query(`
        INSERT INTO app_settings (
          approvals_required_for_allowance,
          po_generation_date,
          invoice_generation_date
        ) VALUES (1, 1, 1);
      `);
      console.log('✅ Default settings created\n');
    } else {
      console.log('✅ Settings already exist\n');
    }

    // Verify changes
    console.log('🔍 Verifying changes...');
    const result = await pool.query(`
      SELECT 
        approvals_required_for_allowance,
        po_generation_date,
        invoice_generation_date,
        created_at
      FROM app_settings 
      LIMIT 1;
    `);

    if (result.rows.length > 0) {
      console.log('📋 Current Settings:');
      console.log('   Approvals Required for Allowance:', result.rows[0].approvals_required_for_allowance);
      console.log('   PO Generation Date:', result.rows[0].po_generation_date, '(day of month)');
      console.log('   Invoice Generation Date:', result.rows[0].invoice_generation_date, '(day of month)');
    }

    console.log('\n✅ Migration Complete!\n');
    console.log('Note:');
    console.log('  - Admins can generate POs/Invoices anytime');
    console.log('  - Vendors can only generate on the specified dates');
    console.log('  - Update these dates from the Settings page\n');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration Error:', error.message);
    console.error(error);
    if (pool) await pool.end();
    process.exit(1);
  }
}

addGenerationDateSettings();

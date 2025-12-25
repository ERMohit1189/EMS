require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkSitesColumns() {
  const client = await pool.connect();
  
  try {
    console.log('\n=== CHECKING SITES TABLE COLUMNS ===\n');

    // Get column names from sites table
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sites' 
      AND column_name LIKE '%partner%' OR column_name LIKE '%vendor%' OR column_name LIKE '%code%'
      ORDER BY ordinal_position
    `);

    console.log('Columns with partner/vendor/code:\n');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Get a sample site with vendor info
    console.log('\n=== SAMPLE SITE DATA ===\n');
    const siteResult = await client.query(`
      SELECT s.id, s.plan_id, s.vendor_id, s.partner_name,
             v.name as vendor_name, v.vendor_code
      FROM sites s
      LEFT JOIN vendors v ON s.vendor_id = v.id
      LIMIT 3
    `);

    siteResult.rows.forEach((site, index) => {
      console.log(`${index + 1}. Site: ${site.plan_id}`);
      console.log(`   Partner Name: ${site.partner_name || 'NULL'}`);
      console.log(`   Vendor Name (from join): ${site.vendor_name || 'NULL'}`);
      console.log(`   Vendor Code (from join): ${site.vendor_code || 'NULL'}`);
      console.log('');
    });

  } finally {
    client.release();
    await pool.end();
  }
}

checkSitesColumns().catch(console.error);

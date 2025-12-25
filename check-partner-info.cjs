require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkPartnerColumns() {
  const client = await pool.connect();
  
  try {
    console.log('\n=== CHECKING SITES TABLE FOR PARTNER INFO ===\n');

    const result = await client.query(`
      SELECT id, site_id, plan_id, vendor_id, partner_name
      FROM sites
      WHERE soft_at_status = 'Approved' AND phy_at_status = 'Approved'
      LIMIT 5
    `);

    console.log('Sample approved sites:\n');
    result.rows.forEach((site, index) => {
      console.log(`${index + 1}. Plan ID: ${site.plan_id}`);
      console.log(`   Partner Name: ${site.partner_name || 'NULL'}`);
      console.log(`   Vendor ID: ${site.vendor_id}`);
      console.log('');
    });

  } finally {
    client.release();
    await pool.end();
  }
}

checkPartnerColumns().catch(console.error);

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkVendorCodes() {
  const client = await pool.connect();
  
  try {
    console.log('\n=== CHECKING VENDOR CODES ===\n');

    // Get all vendors with their codes
    const result = await client.query(`
      SELECT id, name, vendor_code, email, status
      FROM vendors
      ORDER BY created_at DESC
      LIMIT 20
    `);

    const vendors = result.rows;

  console.log(`Total vendors checked: ${vendors.length}\n`);

  vendors.forEach((vendor, index) => {
    console.log(`${index + 1}. ${vendor.name}`);
    console.log(`   Email: ${vendor.email}`);
    console.log(`   Vendor Code: ${vendor.vendor_code || '❌ NOT SET'}`);
    console.log(`   Status: ${vendor.status}`);
    console.log(`   ID: ${vendor.id}`);
    console.log('');
  });

  // Count vendors without codes
  const withoutCodes = vendors.filter(v => !v.vendor_code);
  console.log(`\n📊 Summary:`);
  console.log(`   Total vendors: ${vendors.length}`);
  console.log(`   With vendor codes: ${vendors.length - withoutCodes.length}`);
  console.log(`   Without vendor codes: ${withoutCodes.length}`);

  if (withoutCodes.length > 0) {
    console.log('\n⚠️  Vendors missing codes:');
    withoutCodes.forEach(v => console.log(`   - ${v.name} (${v.email})`));
  }
  } finally {
    client.release();
    await pool.end();
  }
}

checkVendorCodes().catch(console.error);

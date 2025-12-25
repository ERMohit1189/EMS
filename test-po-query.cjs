require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testPOQuery() {
  const client = await pool.connect();
  
  try {
    console.log('\n=== TESTING PO QUERY WITH VENDOR CODE ===\n');

    // Test the exact query that getPOsWithDetails should produce
    const result = await client.query(`
      SELECT 
        po.id,
        po.site_id,
        po.vendor_id,
        po.po_number,
        po.description,
        po.quantity,
        po.unit_price,
        po.cgst_amount,
        po.sgst_amount,
        po.igst_amount,
        po.gst_type,
        po.gst_apply,
        po.created_at,
        s.hop_a_b as site_name,
        s.id as site_uuid,
        s.plan_id,
        s.site_a_ant_dia,
        s.site_b_ant_dia,
        v.name as vendor_name,
        v.vendor_code
      FROM purchase_orders po
      LEFT JOIN sites s ON po.site_id = s.id
      LEFT JOIN vendors v ON po.vendor_id = v.id
      ORDER BY po.created_at DESC
      LIMIT 5
    `);

    console.log(`Found ${result.rows.length} POs\n`);

    result.rows.forEach((po, index) => {
      console.log(`${index + 1}. PO #${po.po_number}`);
      console.log(`   Vendor: ${po.vendor_name}`);
      console.log(`   Vendor Code: ${po.vendor_code || '❌ NULL/MISSING'}`);
      console.log(`   Vendor ID: ${po.vendor_id}`);
      console.log(`   Plan ID: ${po.plan_id}`);
      console.log('');
    });

    // Also check vendors table directly
    console.log('\n=== CHECKING VENDORS IN POs ===\n');
    const vendorResult = await client.query(`
      SELECT DISTINCT v.id, v.name, v.vendor_code
      FROM vendors v
      INNER JOIN purchase_orders po ON v.id = po.vendor_id
    `);

    vendorResult.rows.forEach((v, index) => {
      console.log(`${index + 1}. ${v.name}`);
      console.log(`   ID: ${v.id}`);
      console.log(`   Code: ${v.vendor_code || '❌ NULL'}`);
      console.log('');
    });

  } finally {
    client.release();
    await pool.end();
  }
}

testPOQuery().catch(console.error);

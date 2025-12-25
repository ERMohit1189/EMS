require('dotenv').config();
const { Pool } = require('pg');

(async function(){
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    console.log('Running smoke tests...');
    // 1) get a vendor
    const vendorRes = await client.query('SELECT id FROM vendors LIMIT 1');
    if (vendorRes.rows.length === 0) {
      throw new Error('No vendor found in DB; create one first');
    }
    const vendorId = vendorRes.rows[0].id;
    console.log('Found vendor id:', vendorId);

    // 2) Insert site
    const planId = 'SMOKE-' + Date.now();
    const insertSiteSql = `INSERT INTO sites (vendor_id, plan_id, status, created_at, updated_at) VALUES ($1,$2,'Pending', NOW(), NOW()) RETURNING id, plan_id, vendor_id`;
    const siteRes = await client.query(insertSiteSql, [vendorId, planId]);
    const newSite = siteRes.rows[0];
    console.log('Inserted site:', newSite);

    // 3) Insert PO
    const poNumber = 'PO-SMOKE-' + Date.now();
    // Create a PO header and corresponding line item instead of inserting site_id on the header
    const poSql = `INSERT INTO purchase_orders (po_number, vendor_id, description, quantity, unit_price, total_amount, po_date, due_date, status, created_at, updated_at) VALUES ($1,$2,$3,1,100.00,100.00,NOW(),NOW()+INTERVAL '7 days','Draft',NOW(),NOW()) RETURNING id, po_number`;
    const polSql = `INSERT INTO purchase_order_lines (po_id, site_id, description, quantity, unit_price, total_amount, created_at, updated_at) VALUES ($1,$2,$3,1,100.00,100.00,NOW(),NOW()) RETURNING id`;

    const poRes = await client.query(poSql, [poNumber, vendorId, 'Smoke test PO']);
    console.log('Inserted PO:', poRes.rows[0]);

    // 4) Insert a PO line that links the PO to the site
    const polRes = await client.query(polSql, [poRes.rows[0].id, newSite.id, 'Smoke test PO line']);
    console.log('Inserted PO line:', polRes.rows[0]);

    // 5) Verify PO join with site via lines
    const verifySql = `SELECT po.id as po_id, po.po_number, pol.site_id, s.id as site_uuid, s.plan_id FROM purchase_orders po LEFT JOIN purchase_order_lines pol ON pol.po_id = po.id LEFT JOIN sites s ON pol.site_id = s.id WHERE po.id = $1`;
    const verifyRes = await client.query(verifySql, [poRes.rows[0].id]);
    console.log('PO with joined site via line:', verifyRes.rows[0]);

    // 5) Export sample - fetch site and related payment_master if any
    const exportRes = await client.query(`SELECT s.id, s.plan_id, s.vendor_id, s.status FROM sites s WHERE s.id = $1`, [newSite.id]);
    console.log('Export sample row:', exportRes.rows[0]);

    console.log('Smoke tests PASSED');
  } catch (e) {
    console.error('Smoke tests FAILED:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
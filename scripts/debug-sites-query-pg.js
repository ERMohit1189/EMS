import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const sql = `SELECT
      sites.id as "siteId",
      sites.plan_id as "planId",
      sites.vendor_id as "vendorId",
      sites.circle,
      sites.max_ant_size as "maxAntSize",
      sites.soft_at_status as "softAtStatus",
      sites.phy_at_status as "phyAtStatus",
      sites.created_at as "createdAt",
      sites.updated_at as "updatedAt",
      payment_masters.vendor_amount as "vendorAmount",
      payment_masters.site_amount as "siteAmount"
    FROM sites
    LEFT JOIN payment_masters ON
      sites.id = payment_masters.site_id AND
      sites.plan_id = payment_masters.plan_id AND
      sites.vendor_id = payment_masters.vendor_id AND
      sites.max_ant_size = payment_masters.antenna_size
    LIMIT 50 OFFSET 0`;

    const res = await client.query(sql);
    console.log('rows count:', res.rows.length);
    for (let i = 0; i < Math.min(10, res.rows.length); i++) {
      const r = res.rows[i];
      console.log(i, r === null, typeof r, Object.keys(r).slice(0, 10));
    }
    // Check for any null row values
    const nullRows = res.rows.filter(r => r == null).length;
    console.log('nullRows:', nullRows);
  } catch (err) {
    console.error('SQL error:', err);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

run();

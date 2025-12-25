const pg = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkSitesStatus() {
  try {
    console.log('\n========================================');
    console.log('SITE STATUS DIAGNOSTIC REPORT');
    console.log('========================================\n');

    // 1. Check sites with approved SOFT-AT and PHY-AT status
    console.log('1️⃣  SITES WITH APPROVED SOFT-AT AND PHY-AT STATUS:\n');
    const approvedSitesQuery = `
      SELECT 
        s.id,
        s.plan_id,
        s.vendor_id,
        v.name as vendor_name,
        s.soft_at_status,
        s.phy_at_status,
        s.max_ant_size
      FROM sites s
      LEFT JOIN vendors v ON s.vendor_id = v.id
      WHERE s.soft_at_status = 'Approved' 
        AND s.phy_at_status = 'Approved'
      ORDER BY s.created_at DESC;
    `;
    
    const approvedSites = await pool.query(approvedSitesQuery);
    console.log(`   Total: ${approvedSites.rows.length} sites\n`);
    
    if (approvedSites.rows.length > 0) {
      approvedSites.rows.forEach((site, index) => {
        console.log(`   ${index + 1}. Site UUID: ${site.id}`);
        console.log(`      Plan ID: ${site.plan_id}`);
        console.log(`      Vendor: ${site.vendor_name || 'Unknown'}`);
        console.log(`      Max Antenna Size: ${site.max_ant_size || 'N/A'}`);
        console.log(`      SOFT-AT: ${site.soft_at_status}, PHY-AT: ${site.phy_at_status}\n`);
      });
    } else {
      console.log('   ⚠️  No sites found with both statuses approved!\n');
    }

    // 2. Check sites used in PO generation
    console.log('\n2️⃣  SITES USED IN PO GENERATION:\n');
    const usedSitesQuery = `
      SELECT 
        po.id as po_id,
        po.po_number,
        po.site_id,
        s.id as site_code,
        s.plan_id,
        v.name as vendor_name,
        po.created_at
      FROM purchase_orders po
      LEFT JOIN sites s ON po.site_id = s.id
      LEFT JOIN vendors v ON po.vendor_id = v.id
      ORDER BY po.created_at DESC;
    `;
    
    const usedSites = await pool.query(usedSitesQuery);
    console.log(`   Total: ${usedSites.rows.length} POs generated\n`);
    
    if (usedSites.rows.length > 0) {
      usedSites.rows.forEach((po, index) => {
        console.log(`   ${index + 1}. PO Number: ${po.po_number}`);
        console.log(`      Site: ${po.site_code} (${po.plan_id})`);
        console.log(`      Vendor: ${po.vendor_name || 'Unknown'}`);
        console.log(`      Site Reference (PO): ${po.site_id}`);
        console.log(`      Created: ${po.created_at}\n`);
      });
    } else {
      console.log('   ℹ️  No POs generated yet.\n');
    }

    // 3. Check remaining sites (approved but no PO)
    console.log('\n3️⃣  SITES AVAILABLE FOR PO GENERATION (Approved but no PO yet):\n');
    const remainingSitesQuery = `
      SELECT 
        s.id,
        s.plan_id,
        s.vendor_id,
        v.name as vendor_name,
        v.vendor_code,
        s.max_ant_size,
        pm.vendor_amount
      FROM sites s
      LEFT JOIN vendors v ON s.vendor_id = v.id
      LEFT JOIN payment_masters pm ON (
        s.id = pm.site_id 
        AND s.plan_id = pm.plan_id 
        AND s.vendor_id = pm.vendor_id
        AND s.max_ant_size = pm.antenna_size
      )
      WHERE s.soft_at_status = 'Approved' 
        AND s.phy_at_status = 'Approved'
        AND s.id NOT IN (SELECT site_id FROM purchase_orders WHERE site_id IS NOT NULL)
      ORDER BY v.name, s.id;
    `;
    
    const remainingSites = await pool.query(remainingSitesQuery);
    console.log(`   Total: ${remainingSites.rows.length} sites available\n`);
    
    if (remainingSites.rows.length > 0) {
      remainingSites.rows.forEach((site, index) => {
        const hasAmount = site.vendor_amount ? '✅' : '❌';
        console.log(`   ${index + 1}. Site UUID: ${site.id}`);
        console.log(`      Plan ID: ${site.plan_id}`);
        console.log(`      Vendor: ${site.vendor_name} (${site.vendor_code || 'N/A'})`);
        console.log(`      Max Antenna Size: ${site.max_ant_size || 'N/A'}`);
        console.log(`      Vendor Amount: ${site.vendor_amount || 'NOT SET'} ${hasAmount}`);
        console.log('\n');
      });
      
      const sitesWithoutAmount = remainingSites.rows.filter(s => !s.vendor_amount);
      if (sitesWithoutAmount.length > 0) {
        console.log(`   ⚠️  WARNING: ${sitesWithoutAmount.length} site(s) don't have vendor amounts configured in Payment Master!`);
        console.log(`   These sites need vendor amounts to be configured before PO generation.\n`);
      }
    } else {
      console.log('   ℹ️  All approved sites already have POs generated!\n');
    }

    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`✓ Approved Sites (SOFT-AT & PHY-AT): ${approvedSites.rows.length}`);
    console.log(`✓ Sites with POs Generated: ${usedSites.rows.length}`);
    console.log(`✓ Sites Available for PO Generation: ${remainingSites.rows.length}`);
    console.log('========================================\n');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkSitesStatus();

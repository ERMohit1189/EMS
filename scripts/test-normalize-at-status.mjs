#!/usr/bin/env node

const API_BASE = process.env.API_BASE || 'http://localhost:7000';

(async () => {
  try {
    const planId = `TEST-NORM-${Date.now()}`;
    const site = {
      siteId: `TEST-${Date.now()}`,
      vendorId: null,
      partnerCode: 'TESTV',
      planId,
      partnerName: 'Test Vendor',
      softAtStatus: 'some-unknown-status',
      phyAtStatus: null
    };

    console.log('Creating vendor TESTV (if missing)');
    const vendorResp = await fetch(`${API_BASE}/api/vendors/batch-find-or-create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendors: [{ code: 'TESTV', name: 'Test Vendor' }] })
    });
    const vendorJson = await vendorResp.json().catch(() => null);
    const vendorId = vendorJson?.vendors?.[0]?.id;
    if (!vendorId) {
      console.error('Could not create/find vendor TESTV', vendorJson);
      process.exit(1);
    }
    site.vendorId = vendorId;

    console.log('Posting site with softAtStatus="some-unknown-status", phyAtStatus=null');
    const r = await fetch(`${API_BASE}/api/sites/batch-upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sites: [site] })
    });

    const res = await r.json().catch(() => null);
    console.log('batch-upsert response:', r.status, res);

    // Wait briefly for DB to commit
    await new Promise((resv) => setTimeout(resv, 500));

    // Fetch by search (planId)
    const q = encodeURIComponent(planId);
    const list = await fetch(`${API_BASE}/api/sites?search=${q}&pageSize=10`);
    const data = await list.json();
    const found = data.data?.find((s) => s.planId === planId);
    if (!found) {
      console.error('Site not found in list response', data);
      process.exit(1);
    }

    console.log('Stored site statuses:', { softAtStatus: found.softAtStatus, phyAtStatus: found.phyAtStatus });
    process.exit(0);
  } catch (e) {
    console.error('Error running test:', e);
    process.exit(1);
  }
})();

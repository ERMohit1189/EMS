#!/usr/bin/env node
/* test-po-generate.mjs
   Simple script to POST a grouped PO payload to /api/purchase-orders/generate
   Usage: node scripts/test-po-generate.mjs [baseUrl]
*/

const baseUrl = process.argv[2] || process.env.BASE_URL || 'http://localhost:3000';
const url = `${baseUrl.replace(/\/$/, '')}/api/purchase-orders/generate`;

const payload = {
  pos: [
    {
      vendorId: 1,
      poNumber: 'TEST-PO-1',
      poDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      lines: [
        { siteId: 101, description: 'Line 1', quantity: 1, unitPrice: '100', totalAmount: '100' },
        { siteId: 102, description: 'Line 2', quantity: 2, unitPrice: '50', totalAmount: '100' }
      ]
    }
  ]
};

(async () => {
  try {
    console.log('[test-po-generate] Posting to', url);
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      // include credentials if you want to use existing cookies in a browser session
      // credentials: 'include',
      body: JSON.stringify(payload)
    });

    console.log('[test-po-generate] status:', resp.status, resp.statusText);
    const ct = resp.headers.get('content-type') || '';
    console.log('[test-po-generate] content-type:', ct);

    const text = await resp.text();
    const preview = text.slice(0, 800);
    console.log('[test-po-generate] body preview:', preview);

    if (ct.includes('application/json')) {
      try {
        const json = JSON.parse(text);
        console.log('[test-po-generate] parsed json:', JSON.stringify(json, null, 2));
      } catch (e) {
        console.error('[test-po-generate] failed to parse json body', e?.message || e);
      }
    } else if (/^\s*<\!DOCTYPE|<html/i.test(preview)) {
      console.error('[test-po-generate] response looks like HTML (likely error page)');
    } else {
      console.warn('[test-po-generate] non-json response, not HTML');
    }
  } catch (e) {
    console.error('[test-po-generate] request failed', e?.message || e);
    process.exit(2);
  }
})();
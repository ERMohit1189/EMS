#!/usr/bin/env node
/* test-po-generate-site-header.mjs
   Posts a grouped PO payload where header omits siteId but lines include siteId; expects server to use the first line's siteId for header
*/
const baseUrl = process.argv[2] || process.env.BASE_URL || 'http://localhost:3000';
const url = `${baseUrl.replace(/\/$/, '')}/api/purchase-orders/generate`;

const payload = {
  pos: [
    {
      vendorId: 1,
      poNumber: `TEST-PO-${Date.now()}`,
      poDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      lines: [
        { siteId: '98d73c76-9f67-4d66-93f2-76dbd3aad08b', description: 'Line A', quantity: 1, unitPrice: '100', totalAmount: '100' }
      ]
    }
  ]
};

(async () => {
  try {
    console.log('[test-po-generate-site-header] Posting to', url);
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    console.log('[test-po-generate-site-header] status:', resp.status, resp.statusText);
    const ct = resp.headers.get('content-type') || '';
    console.log('[test-po-generate-site-header] content-type:', ct);

    const text = await resp.text();
    const preview = text.slice(0, 1200);
    console.log('[test-po-generate-site-header] body preview:', preview);

    if (ct.includes('application/json')) {
      try {
        const json = JSON.parse(text);
        console.log('[test-po-generate-site-header] parsed json:', JSON.stringify(json, null, 2));
      } catch (e) {
        console.error('[test-po-generate-site-header] failed to parse json body', e?.message || e);
      }
    } else if (/^\s*<\!DOCTYPE|<html/i.test(preview)) {
      console.error('[test-po-generate-site-header] response looks like HTML (likely error page)');
    } else {
      console.warn('[test-po-generate-site-header] non-json response, not HTML');
    }
  } catch (e) {
    console.error('[test-po-generate-site-header] request failed', e?.message || e);
    process.exit(2);
  }
})();
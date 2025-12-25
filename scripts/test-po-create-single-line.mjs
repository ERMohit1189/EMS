#!/usr/bin/env node
/* test-po-create-single-line.mjs
   Posts a single-line PO payload to /api/purchase-orders with legacy siteId and verifies server creates header + line
*/
const baseUrl = process.argv[2] || process.env.BASE_URL || 'http://localhost:3000';
const url = `${baseUrl.replace(/\/$/, '')}/api/purchase-orders`;

const payload = {
  vendorId: 1,
  siteId: '98d73c76-9f67-4d66-93f2-76dbd3aad08b',
  poNumber: `TEST-SINGLE-PO-${Date.now()}`,
  description: 'Single line test PO',
  quantity: 1,
  unitPrice: '123.45',
  totalAmount: '123.45'
};

(async () => {
  try {
    console.log('[test-po-create-single-line] Posting to', url);
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    console.log('[test-po-create-single-line] status:', resp.status, resp.statusText);
    const ct = resp.headers.get('content-type') || '';
    console.log('[test-po-create-single-line] content-type:', ct);

    const text = await resp.text();
    const preview = text.slice(0, 1200);
    console.log('[test-po-create-single-line] body preview:', preview);

    if (ct.includes('application/json')) {
      try {
        const json = JSON.parse(text);
        console.log('[test-po-create-single-line] parsed json:', JSON.stringify(json, null, 2));
      } catch (e) {
        console.error('[test-po-create-single-line] failed to parse json body', e?.message || e);
      }
    } else if (/^\s*<\!DOCTYPE|<html/i.test(preview)) {
      console.error('[test-po-create-single-line] response looks like HTML (likely error page)');
    } else {
      console.warn('[test-po-create-single-line] non-json response, not HTML');
    }
  } catch (e) {
    console.error('[test-po-create-single-line] request failed', e?.message || e);
    process.exit(2);
  }
})();
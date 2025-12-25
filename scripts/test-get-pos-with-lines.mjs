#!/usr/bin/env node
/* test-get-pos-with-lines.mjs
   GET /api/purchase-orders?withLines=true and GET /api/purchase-orders/:id?withLines=true
*/
const baseUrl = process.argv[2] || process.env.BASE_URL || 'http://localhost:3000';

(async () => {
  try {
    const listUrl = `${baseUrl.replace(/\/$/, '')}/api/purchase-orders?withLines=true&page=1&pageSize=10`;
    console.log('[test-get-pos-with-lines] Fetching', listUrl);
    let resp = await fetch(listUrl, { credentials: 'include' });
    console.log('status:', resp.status, resp.statusText, 'content-type:', resp.headers.get('content-type'));
    const json = await resp.json();
    console.log('list result keys:', Object.keys(json));
    if (json.data && json.data.length) {
      console.log('First PO sample:', JSON.stringify(json.data[0], null, 2).slice(0, 1200));
      const id = json.data[0].id;
      const singleUrl = `${baseUrl.replace(/\/$/, '')}/api/purchase-orders/${id}?withLines=true`;
      console.log('[test-get-pos-with-lines] Fetching single PO with lines:', singleUrl);
      resp = await fetch(singleUrl, { credentials: 'include' });
      console.log('status:', resp.status, resp.statusText, 'content-type:', resp.headers.get('content-type'));
      const single = await resp.json();
      console.log('single PO:', JSON.stringify(single, null, 2).slice(0,1200));
    } else {
      console.warn('No POs returned in list to sample');
    }
  } catch (e) {
    console.error('Test failed:', e?.message || e);
    process.exit(2);
  }
})();
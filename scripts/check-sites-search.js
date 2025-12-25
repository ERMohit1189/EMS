const fetch = global.fetch || require('node-fetch');

(async () => {
  try {
    const res = await fetch('http://localhost:7000/api/sites?page=1&pageSize=50&search=1001');
    console.log('status', res.status);
    const text = await res.text();
    console.log('body', text.slice(0, 1000));
    if (res.status >= 500) process.exit(2);
    process.exit(0);
  } catch (err) {
    console.error('error', err);
    process.exit(3);
  }
})();
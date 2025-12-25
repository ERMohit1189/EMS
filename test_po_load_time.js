/**
 * Performance Testing Script for PO Page
 * Run this in browser console to measure actual load times
 */

console.log('=== PO Page Performance Test ===\n');

// Mark important lifecycle events
const marks = {
  pageStart: performance.now(),
  navigationStart: performance.timing.navigationStart || 0
};

// Function to measure time from start
function getElapsed(label) {
  const elapsed = performance.now() - marks.pageStart;
  console.log(`[${elapsed.toFixed(2)}ms] ${label}`);
  return elapsed;
}

// Monitor API calls
const originalFetch = window.fetch;
let apiCalls = [];

window.fetch = function(...args) {
  const startTime = performance.now();
  const url = args[0];

  return originalFetch.apply(this, args)
    .then(response => {
      const duration = performance.now() - startTime;
      const urlStr = typeof url === 'string' ? url : url.toString();
      apiCalls.push({
        url: urlStr,
        duration: duration.toFixed(2),
        status: response.status
      });
      console.log(`[API] ${urlStr} - ${duration.toFixed(2)}ms`);
      return response;
    })
    .catch(error => {
      const duration = performance.now() - startTime;
      const urlStr = typeof url === 'string' ? url : url.toString();
      console.error(`[API ERROR] ${urlStr} - ${duration.toFixed(2)}ms`, error);
      return Promise.reject(error);
    });
};

// Log page load metrics
window.addEventListener('load', function() {
  const loadTime = performance.now() - marks.pageStart;
  console.log('\n=== PAGE LOAD COMPLETE ===');
  console.log(`Total Load Time: ${loadTime.toFixed(2)}ms`);
  console.log(`\nAPI Calls Summary:`);
  console.table(apiCalls);

  // Calculate totals
  const totalApiTime = apiCalls.reduce((sum, call) => sum + parseFloat(call.duration), 0);
  console.log(`\nTotal API Time: ${totalApiTime.toFixed(2)}ms`);
  console.log(`UI Render Time: ${(loadTime - totalApiTime).toFixed(2)}ms`);
});

// Check React DevTools and component render times
setTimeout(() => {
  console.log('\n=== React Performance Check ===');
  console.log('Check React DevTools -> Profiler tab for component render times');
}, 3000);

// Export results to localStorage for later analysis
setTimeout(() => {
  const results = {
    loadTime: performance.now() - marks.pageStart,
    apiCalls: apiCalls,
    navigationTiming: {
      domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart
    }
  };
  localStorage.setItem('poLoadTimeTest', JSON.stringify(results));
  console.log('\nResults saved to localStorage.poLoadTimeTest');
}, 5000);

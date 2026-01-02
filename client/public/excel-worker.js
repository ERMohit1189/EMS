// Web Worker for parsing Excel files without blocking the main thread
importScripts('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');

self.onmessage = function(event) {
  try {
    const { data, type } = event.data;

    if (type === 'parse') {
      const totalStart = performance.now();

      // Step 1: Parse workbook from binary
      const readStart = performance.now();
      const workbook = XLSX.read(data, { type: 'array' });
      const readTime = performance.now() - readStart;
      console.log(`[Worker] XLSX.read() took ${readTime.toFixed(2)}ms`);

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Step 2: Convert sheet to JSON
      const jsonStart = performance.now();
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      const jsonTime = performance.now() - jsonStart;
      console.log(`[Worker] sheet_to_json() took ${jsonTime.toFixed(2)}ms for ${jsonData.length} rows`);

      const totalTime = performance.now() - totalStart;
      console.log(`[Worker] Total parsing time: ${totalTime.toFixed(2)}ms`);

      // Send result back to main thread
      self.postMessage({
        type: 'success',
        data: {
          jsonData: jsonData,
          columns: jsonData.length > 0 ? Object.keys(jsonData[0]) : [],
          rowCount: jsonData.length,
          timing: {
            readTime: readTime.toFixed(2),
            jsonTime: jsonTime.toFixed(2),
            totalTime: totalTime.toFixed(2)
          }
        }
      });
    }
  } catch (error) {
    // Send error back to main thread
    self.postMessage({
      type: 'error',
      error: error.message
    });
  }
};

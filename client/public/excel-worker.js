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

      // Step 2: Convert sheet to JSON using XLSX's optimized sheet_to_json (much faster for large files)
      const jsonStart = performance.now();

      // Use XLSX's built-in sheet_to_json which is highly optimized
      const allRows = XLSX.utils.sheet_to_json(worksheet);
      const headers = allRows.length > 0 ? Object.keys(allRows[0]) : [];

      console.log(`[Worker] sheet_to_json extracted ${allRows.length} rows with ${headers.length} columns`);

      const chunkSize = 5000; // Process and send 5000 rows at a time
      const totalRows = allRows.length;

      console.log(`[Worker] Starting chunked processing of ${totalRows} rows...`);

      // Send headers first
      self.postMessage({
        type: 'headers',
        data: {
          columns: headers,
          totalRows: totalRows,
          chunkSize: chunkSize
        }
      });

      // Process and send data in chunks
      let chunkCount = 0;

      for (let i = 0; i < allRows.length; i += chunkSize) {
        const chunk = allRows.slice(i, i + chunkSize);

        // Filter out completely empty rows in chunk
        const filteredChunk = chunk.filter(row => {
          return Object.values(row).some(val => val !== null && val !== undefined && val !== '');
        });

        // Only send chunk if it has data
        if (filteredChunk.length > 0) {
          chunkCount++;
          const progress = Math.min(i + chunkSize, totalRows);

          self.postMessage({
            type: 'chunk',
            data: {
              chunkNumber: chunkCount,
              rows: filteredChunk,
              rowsProcessed: filteredChunk.length,
              totalRows: filteredChunk.length,
              progress: ((progress / totalRows) * 100).toFixed(2)
            }
          });
        }
      }

      const jsonTime = performance.now() - jsonStart;
      console.log(`[Worker] sheet_to_json() took ${jsonTime.toFixed(2)}ms for ${totalRows} rows`);

      const totalTime = performance.now() - totalStart;
      console.log(`[Worker] Total parsing time: ${totalTime.toFixed(2)}ms`);

      // Send completion message
      self.postMessage({
        type: 'complete',
        data: {
          totalRows: totalRows,
          chunkCount: chunkCount,
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

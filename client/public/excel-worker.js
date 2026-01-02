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

      // Step 2: Convert sheet to JSON using optimized manual approach (faster than sheet_to_json)
      const jsonStart = performance.now();

      // Get range of cells
      const range = XLSX.utils.decode_range(worksheet['!ref']);

      // Get headers from first row
      const headers = [];
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cell = worksheet[XLSX.utils.encode_col(col) + '1'];
        headers.push(cell ? cell.v : `Column${col}`);
      }

      // Build JSON data row by row (much faster than sheet_to_json)
      const jsonData = [];
      for (let row = range.s.r + 1; row <= range.e.r; row++) {
        const rowData = {};
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })];
          rowData[headers[col - range.s.c]] = cell ? cell.v : null;
        }
        jsonData.push(rowData);
      }

      const jsonTime = performance.now() - jsonStart;
      console.log(`[Worker] Manual JSON conversion took ${jsonTime.toFixed(2)}ms for ${jsonData.length} rows`);

      const totalTime = performance.now() - totalStart;
      console.log(`[Worker] Total parsing time: ${totalTime.toFixed(2)}ms`);

      // Send result back to main thread
      self.postMessage({
        type: 'success',
        data: {
          jsonData: jsonData,
          columns: headers,
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

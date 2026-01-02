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

      // Step 2: Convert sheet to JSON using optimized manual approach
      const jsonStart = performance.now();

      // Get range of cells
      const range = XLSX.utils.decode_range(worksheet['!ref']);

      // Get headers from first row
      const headers = [];
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cell = worksheet[XLSX.utils.encode_col(col) + '1'];
        headers.push(cell ? cell.v : `Column${col}`);
      }

      const chunkSize = 5000; // Process and send 5000 rows at a time
      const totalRows = range.e.r - range.s.r;

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
      let actualDataRows = 0;

      for (let startRow = range.s.r + 1; startRow <= range.e.r; startRow += chunkSize) {
        const endRow = Math.min(startRow + chunkSize - 1, range.e.r);
        const jsonData = [];

        for (let row = startRow; row <= endRow; row++) {
          const rowData = {};
          let hasData = false;

          for (let col = range.s.c; col <= range.e.c; col++) {
            const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })];
            const value = cell ? cell.v : null;
            rowData[headers[col - range.s.c]] = value;
            if (value !== null && value !== undefined && value !== '') {
              hasData = true;
            }
          }

          // Only include rows that have at least one cell with data
          if (hasData) {
            jsonData.push(rowData);
            actualDataRows++;
          }
        }

        // Only send chunk if it has data
        if (jsonData.length > 0) {
          chunkCount++;
          const scanProgress = Math.min((startRow + chunkSize) - range.s.r - 1, totalRows);

          self.postMessage({
            type: 'chunk',
            data: {
              chunkNumber: chunkCount,
              rows: jsonData,
              rowsProcessed: actualDataRows,
              totalRows: actualDataRows,
              progress: ((scanProgress / totalRows) * 100).toFixed(2)
            }
          });
        }
      }

      const jsonTime = performance.now() - jsonStart;
      console.log(`[Worker] Manual JSON conversion took ${jsonTime.toFixed(2)}ms for ${totalRows} rows (${actualDataRows} with data)`);

      const totalTime = performance.now() - totalStart;
      console.log(`[Worker] Total parsing time: ${totalTime.toFixed(2)}ms`);
      console.log(`[Worker] Filtered ${totalRows - actualDataRows} empty rows, kept ${actualDataRows} rows with data`);

      // Send completion message
      self.postMessage({
        type: 'complete',
        data: {
          totalRows: actualDataRows,
          scannedRows: totalRows,
          emptyRowsSkipped: totalRows - actualDataRows,
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

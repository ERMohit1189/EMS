// Web Worker for parsing Excel files without blocking the main thread
importScripts('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');

self.onmessage = function(event) {
  try {
    const { data, type } = event.data;

    if (type === 'parse') {
      // Parse Excel file
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Send result back to main thread
      self.postMessage({
        type: 'success',
        data: {
          jsonData: jsonData,
          columns: jsonData.length > 0 ? Object.keys(jsonData[0]) : [],
          rowCount: jsonData.length
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

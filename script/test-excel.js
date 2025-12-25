import ExcelJS from 'exceljs';
import xlsx from 'xlsx';
import fs from 'fs';

const sanitizeCell = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'bigint') return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    try { return JSON.stringify(v); } catch(e) { return String(v); }
  }
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  let s = String(v);
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  return s;
};

(async () => {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Test');
  // add some header rows
  ws.addRow(['Company XYZ']);
  ws.mergeCells('A1:C1');
  ws.addRow([]);
  ws.addRow(['Report Title']);
  ws.addRow(['Generated on: 2025-12-14']);
  ws.addRow([]);

  const data = [
    ['id', 'name', 'notes'],
    [1, 'Normal', 'Everything OK'],
    [2, 'HasNull', null],
    [3, 'HasObject', { a: 1 }],
    [4, 'HasControl', 'Bad\u0001Char'],
    [5, 'HasBigInt', BigInt(12345678901234567890n)],
    [6, 'HasDate', new Date('2025-12-14T12:00:00Z')],
  ];

  data.forEach(r => ws.addRow(r.map(sanitizeCell)));

  const out = 'tmp_test_export.xlsx';
  await workbook.xlsx.writeFile(out);
  console.log('Wrote', out);

  // Read back with xlsx
  const wb = xlsx.readFile(out);
  const s = wb.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[s], { header:1 });
  console.log('Read back rows:', rows.length);
  console.log(rows[5]);

  // cleanup
  fs.unlinkSync(out);
  console.log('OK');
})();
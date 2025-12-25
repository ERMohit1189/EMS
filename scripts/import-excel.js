#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const DEFAULT_FILE = process.argv[2] || 'generated_from_prev_full.xlsx';
const API_BASE = process.argv[3] || process.env.API_BASE || 'http://localhost:7000';
// Optional flag: --measure will print timing information (start, end, duration)
const MEASURE = process.argv.includes('--measure');
const SAVE_MEASURE = process.argv.includes('--save-measurement') || process.argv.includes('--save-measurements');
const MEASUREMENTS_FILE = path.resolve(process.cwd(), '.import_measurements.jsonl');

const filePath = path.resolve(process.cwd(), DEFAULT_FILE);
if (!fs.existsSync(filePath)) {
  console.error('Excel file not found:', filePath);
  process.exit(1);
}

console.log('Using Excel file:', filePath);

function toString(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s || s === 'undefined' || s === 'null') return null;
  return s;
}

function toDate(val) {
  if (val === null || val === undefined) return null;
  const num = Number(val);
  // Treat numeric Excel serial as days since 1900-01-01
  if (!Number.isNaN(num) && num > 0 && num < 100000) {
    const excelEpoch = new Date(1900, 0, 1).getTime();
    const d = new Date((num - 1) * 86400000 + excelEpoch);
    return d.toISOString().split('T')[0];
  }
  const s = toString(val);
  if (!s) return null;
  // Try some formats direct
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch (e) {}
  return null;
}

function headerKey(k) {
  return (k || '').toString().trim().toUpperCase();
}

// Read workbook
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

if (!Array.isArray(jsonData) || jsonData.length === 0) {
  console.error('No rows found in sheet', sheetName);
  process.exit(1);
}

console.log('Read rows:', jsonData.length);

// Map rows to site objects used by client
const siteItems = [];
const vendorCodes = new Map();

for (const row of jsonData) {
  // normalize keys to uppercase for easier mapping
  const normalized = {};
  Object.keys(row).forEach(k => normalized[headerKey(k)] = row[k]);

  const vendorCode = toString(normalized['PARTNER CODE'] || normalized['PARTNERCODE'] || normalized['PARTNER_CODE']);
  const partnerName = toString(normalized['PARTNER NAME'] || normalized['PARTNERNAME'] || normalized['PARTNER_NAME']);
  const planId = toString(normalized['PLAN ID'] || normalized['PLANID'] || normalized['PLAN_ID']);
  const siteId = toString(normalized['SITE ID'] || normalized['SITEID'] || normalized['NOMINAL AOP'] || normalized['NOMINALAOP']);

  if (!vendorCode || !planId) {
    console.warn('Skipping row - missing partner code or plan id:', { vendorCode, planId });
    continue;
  }

  vendorCodes.set(vendorCode, partnerName || vendorCode);

  const siteData = {
    siteId: siteId || `SITE-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
    vendorId: vendorCode, // temporary, will replace with vendorId after batch create
    partnerCode: vendorCode,
    planId,
    partnerName,
    // Minimal additional fields - you can enrich this mapping if needed
    circle: toString(normalized['CIRCLE']),
    nominalAop: toString(normalized['NOMINAL AOP'] || normalized['NOMINALAOP']),
    district: toString(normalized['DISTRICT']),
    project: toString(normalized['PROJECT']),
    status: 'Pending'
  };

  siteItems.push(siteData);
}

if (siteItems.length === 0) {
  console.error('No valid site rows to import');
  process.exit(1);
}

console.log('Sites to import:', siteItems.length, 'Unique vendors:', vendorCodes.size);

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, json: JSON.parse(text), text };
  } catch (e) {
    return { ok: res.ok, status: res.status, json: null, text };
  }
}

async function run() {
  const startTime = MEASURE ? Date.now() : null;
  if (MEASURE) console.log(`[ImportMeasure] Start time: ${new Date().toISOString()}`);

  try {
    // 1. Batch create/find vendors
    const vendorsList = Array.from(vendorCodes.entries()).map(([code, name]) => ({ code, name }));
    const vendorBatchResp = await postJson(`${API_BASE}/api/vendors/batch-find-or-create`, { vendors: vendorsList });
    if (!vendorBatchResp.ok) {
      console.error('Vendor batch failed:', vendorBatchResp.status, vendorBatchResp.text);
      process.exit(1);
    }
    const vendorMap = new Map();
    for (const v of vendorBatchResp.json.vendors) {
      vendorMap.set(v.code, v.id);
    }
    console.log('Resolved vendors:', vendorMap.size);

    // 2. Resolve vendor ids in site items
    const resolvedSites = siteItems.map(s => ({ ...s, vendorId: vendorMap.get(s.vendorId) }));
    const unresolved = resolvedSites.filter(s => !s.vendorId);
    if (unresolved.length > 0) {
      console.warn('Some vendor codes were not resolved, will skip these:', unresolved.length);
    }
    const sitesToUpsert = resolvedSites.filter(s => s.vendorId);

    // 3. Batch upsert sites
    const BATCH_SIZE = 50;
    for (let i = 0; i < sitesToUpsert.length; i += BATCH_SIZE) {
      const batch = sitesToUpsert.slice(i, i + BATCH_SIZE);
      console.log(`Uploading batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} sites)`);
      const r = await postJson(`${API_BASE}/api/sites/batch-upsert`, { sites: batch });
      if (!r.ok) {
        console.error('Batch upsert error:', r.status, r.text);
        // Continue to next batch
      } else {
        console.log('Batch upsert result:', r.json);
      }
      // Throttle a bit to be polite
      await new Promise(res => setTimeout(res, 150));
    }

    console.log('Import script complete');
    if (MEASURE && startTime) {
      const endTime = Date.now();
      const durationMs = endTime - startTime;
      console.log(`[ImportMeasure] Rows read: ${jsonData.length}, Sites to import: ${siteItems.length}`);
      console.log(`[ImportMeasure] End time: ${new Date().toISOString()}`);
      console.log(`[ImportMeasure] Duration: ${durationMs}ms (${(durationMs/1000).toFixed(2)}s)`);
      if (siteItems.length > 0) {
        // durationMs is total milliseconds for N rows
        // seconds per 1000 rows = (durationMs / 1000) * (1000 / N)
        const secondsPerThousand = (durationMs / 1000) * (1000 / siteItems.length);
        const msPerRow = durationMs / siteItems.length;
        console.log(`[ImportMeasure] Measured rate: ${secondsPerThousand.toFixed(2)}s per 1000 rows (${msPerRow.toFixed(2)}ms per row)`);

        if (SAVE_MEASURE) {
          const measurement = {
            timestamp: new Date().toISOString(),
            file: DEFAULT_FILE,
            apiBase: API_BASE,
            rows: jsonData.length,
            sites: siteItems.length,
            durationMs,
            msPerRow,
            secondsPerThousand
          };
          try {
            fs.appendFileSync(MEASUREMENTS_FILE, JSON.stringify(measurement) + '\n');
            console.log(`[ImportMeasure] Saved measurement to ${MEASUREMENTS_FILE}`);
          } catch (e) {
            console.warn('[ImportMeasure] Could not save measurement:', e.message || e);
          }
        }
      }
    }
  } catch (e) {
    console.error('Import script error:', e);
    if (MEASURE && startTime) {
      const endTime = Date.now();
      console.log(`[ImportMeasure] End time: ${new Date().toISOString()}`);
      console.log(`[ImportMeasure] Duration until error: ${endTime - startTime}ms`);
    }
    process.exit(1);
  }
}

run();

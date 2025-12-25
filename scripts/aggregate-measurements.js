#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const FILE = path.resolve(process.cwd(), '.import_measurements.jsonl');
const APPLY = process.argv.includes('--apply');

function stats(arr) {
  if (!arr.length) return null;
  const sum = arr.reduce((a, b) => a + b, 0);
  const mean = sum / arr.length;
  const sorted = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
  const std = Math.sqrt(variance);
  return { count: arr.length, mean, median, std };
}

if (!fs.existsSync(FILE)) {
  console.error('No measurements file found at', FILE);
  process.exit(1);
}

const lines = fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean);
const records = lines.map(l => JSON.parse(l));

const msPerRow = records.map(r => r.msPerRow).filter(Boolean);
const sPerThousand = records.map(r => r.secondsPerThousand).filter(Boolean);

const msStats = stats(msPerRow);
const sStats = stats(sPerThousand);

console.log('Measurements:', records.length);
if (msStats) console.log(`ms/row -> count=${msStats.count} mean=${msStats.mean.toFixed(2)} median=${msStats.median.toFixed(2)} std=${msStats.std.toFixed(2)}`);
if (sStats) console.log(`s/1000 -> count=${sStats.count} mean=${sStats.mean.toFixed(2)} median=${sStats.median.toFixed(2)} std=${sStats.std.toFixed(2)}`);

const recommended = Math.round(sStats ? sStats.mean : (msStats.mean * 1000));
console.log('Recommended seconds per 1000 rows (rounded):', recommended);

if (APPLY) {
  // Update client estimator in `client/src/pages/vendor/ExcelImport.tsx`
  const clientFile = path.resolve(process.cwd(), 'client/src/pages/vendor/ExcelImport.tsx');
  if (!fs.existsSync(clientFile)) {
    console.error('Client file not found:', clientFile);
    process.exit(1);
  }
  const content = fs.readFileSync(clientFile, 'utf8');
  const newContent = content.replace(/const SECONDS_PER_THOUSAND = \d+;/, `const SECONDS_PER_THOUSAND = ${recommended};`);
  // Create a timestamped backup before applying
  const backupFile = clientFile + `.bak.${new Date().toISOString().replace(/[:.]/g, '-')}`;
  fs.writeFileSync(backupFile, content, 'utf8');
  fs.writeFileSync(clientFile, newContent, 'utf8');
  console.log(`Backup created: ${backupFile}`);
  console.log(`Applied recommended estimator (${recommended}s/1000) to ${clientFile}`);
}

process.exit(0);

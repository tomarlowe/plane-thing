#!/usr/bin/env bun
// builds src/data/airports.bin.gz and the country lookup list for the settings page from the OurAirports csv files.
//   git clone --depth 1 https://github.com/davidmegginson/ourairports-data <folder>
//   bun scripts/build-airports.ts <folder>
// OurAirports is public domain. closed airports are dropped, everything else is kept: private strips and heliports too
import { gzipSync } from 'fflate';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: bun scripts/build-airports.ts <folder with airports.csv and countries.csv>');
  process.exit(1);
}

// a csv reader that understands quotes, doubled quotes and line breaks inside quotes
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function table(file: string): Array<Record<string, string>> {
  const rows = parseCsv(readFileSync(join(dir!, file), 'utf8'));
  const head = rows[0]!;
  return rows.slice(1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

const KIND: Record<string, number> = {
  large_airport: 0,
  medium_airport: 1,
  small_airport: 2,
  heliport: 3,
  seaplane_base: 4,
  balloonport: 5,
};

const countries = table('countries.csv')
  .map(c => ({ code: c.code!.toUpperCase(), name: c.name! }))
  .filter(c => /^[A-Z]{2}$/.test(c.code))
  .sort((a, b) => a.name.localeCompare(b.name));
const countryIndex = new Map(countries.map((c, i) => [c.code, i]));

const enc = new TextEncoder();
const chunks: Uint8Array[] = [];
let count = 0;
const usedCountries = new Set<number>();
const rows = table('airports.csv')
  .filter(a => a.type !== 'closed' && a.type! in KIND)
  .sort((a, b) => Number(a.id) - Number(b.id));
for (const a of rows) {
  const lat = Number(a.latitude_deg);
  const lon = Number(a.longitude_deg);
  const ci = countryIndex.get((a.iso_country ?? '').toUpperCase());
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || a.latitude_deg === '' || ci === undefined) continue;
  const code = enc.encode((a.iata_code || a.icao_code || a.ident || '').slice(0, 7));
  const name = enc.encode((a.name ?? '').slice(0, 60));
  if (!code.length) continue;
  const rec = new Uint8Array(4 + 4 + 1 + 2 + 1 + code.length + 1 + name.length);
  const dv = new DataView(rec.buffer);
  dv.setInt32(0, Math.round(lat * 1e5));
  dv.setInt32(4, Math.round(lon * 1e5));
  dv.setUint8(8, KIND[a.type!]!);
  dv.setUint16(9, ci);
  dv.setUint8(11, code.length);
  rec.set(code, 12);
  dv.setUint8(12 + code.length, name.length);
  rec.set(name, 13 + code.length);
  chunks.push(rec);
  usedCountries.add(ci);
  count++;
}

const head = new Uint8Array(4 + 4 + 2 + countries.length * 2);
const hv = new DataView(head.buffer);
head.set(enc.encode('DSA1'), 0);
hv.setUint32(4, count);
hv.setUint16(8, countries.length);
countries.forEach((c, i) => head.set(enc.encode(c.code), 10 + i * 2));
const all = new Uint8Array(head.length + chunks.reduce((n, c) => n + c.length, 0));
all.set(head, 0);
let at = head.length;
for (const c of chunks) {
  all.set(c, at);
  at += c.length;
}
const out = resolve(import.meta.dir, '../src/data/airports.bin.gz');
// a fixed header time keeps the bytes the same on every run
writeFileSync(out, gzipSync(all, { level: 9, mtime: 0 }));
console.log(`${count} airports, ${all.length} bytes raw, ${gzipSync(all, { level: 9 }).length} bytes packed`);

// the settings page lists the countries that have airports, so a code typed from it always finds something
const lines = countries
  .filter((_, i) => usedCountries.has(i))
  .map(c => `  ${JSON.stringify([c.code, c.name])},`)
  .join('\n');
const listPath = resolve(import.meta.dir, '../settings/countries.ts');
writeFileSync(
  listPath,
  `// country names for the lookup list on the settings page. codes are the two letter ones the airport file uses\n` +
    `export const COUNTRIES: Array<[code: string, name: string]> = [\n${lines}\n];\n`,
);
console.log(`settings country list: ${usedCountries.size} countries`);

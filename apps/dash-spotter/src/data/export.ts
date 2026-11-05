import { isoLocal } from './format';
import type { LogEntry } from './types';

// plane spotting tools take a table with the tail number first. these columns follow that order, then come extras
export const CSV_HEAD = [
  'Registration',
  'Aircraft Type',
  'Airline',
  'Serial Number',
  'Date and Time Seen',
  'Place',
  'Notes',
  'Callsign',
  'ICAO Type Code',
  'Closest Distance (mi)',
  'Bearing at Closest (deg)',
  'Highest Altitude (ft)',
  'Times Seen',
  'ICAO Hex',
  'Source',
];

const SOURCE = 'Dash Spotter, live ADS-B data from adsb.lol, airplanes.live or adsb.fi';

export function csvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v);
  // a leading = + - @ can run as a formula when a spreadsheet opens the file
  const safe = /^[=+@]/.test(s) || (/^-/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) ? `'${s}` : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export interface ExportOpts {
  // seconds to add to unix time to get local time. a function lets a daylight saving change fall on the right rows
  offsetS: number | ((unixS: number) => number);
  withCoords: boolean;
}

const offsetAt = (o: ExportOpts, unixS: number) => (typeof o.offsetS === 'function' ? o.offsetS(unixS) : o.offsetS);

export function toCsv(rows: LogEntry[], o: ExportOpts): string {
  const head = o.withCoords ? [...CSV_HEAD, 'Observer Latitude', 'Observer Longitude'] : CSV_HEAD;
  const lines = [head.map(csvCell).join(',')];
  const sorted = [...rows].sort((a, b) => a.f - b.f);
  for (const r of sorted) {
    const cells: Array<string | number | null> = [
      r.r,
      r.d ?? r.t,
      r.o,
      '',
      isoLocal(r.f, offsetAt(o, r.f)),
      r.w,
      '',
      r.c,
      r.t,
      (r.m / 10).toFixed(1),
      r.b,
      r.h * 100,
      r.n,
      r.hex.toUpperCase(),
      SOURCE,
    ];
    if (o.withCoords) cells.push(r.p[0], r.p[1]);
    lines.push(cells.map(csvCell).join(','));
  }
  // a byte order mark makes excel read accents correctly
  return '﻿' + lines.join('\r\n') + '\r\n';
}

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// kml puts every sighting where the observer stood, so the log opens as a map in google earth. needs coordinates
export function toKml(rows: LogEntry[], o: ExportOpts): string {
  const marks = [...rows]
    .sort((a, b) => a.f - b.f)
    .map(r => {
      const name = [r.r ?? r.c ?? r.hex.toUpperCase(), r.d ?? r.t].filter(Boolean).join(' ');
      const desc = [
        r.o ? `Operator: ${r.o}` : '',
        `Seen: ${isoLocal(r.f, offsetAt(o, r.f))}`,
        `Closest: ${(r.m / 10).toFixed(1)} mi at ${r.b} deg`,
        `Times seen: ${r.n}`,
      ]
        .filter(Boolean)
        .join('\n');
      return `<Placemark><name>${xml(name)}</name><description>${xml(desc)}</description><Point><coordinates>${r.p[1]},${r.p[0]},0</coordinates></Point></Placemark>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Dash Spotter log</name>\n${marks}\n</Document></kml>\n`;
}

import { gunzipSync } from 'fflate';
import { bearingDeg, distanceMi } from './geo';
import type { AirportRec, AirportsMode, Coord, NearAirport } from './types';

// the whole world, decoded once. the app never searches this directly: it filters down to a small working set first
export interface AirportDb {
  all: AirportRec[];
}

export const AUTO_RADIUS_MI = 250;
// the working set is rebuilt when the user has moved this far from where it was built
export const AUTO_RELOAD_MI = 100;

export function decodeAirports(packed: Uint8Array): AirportDb {
  const raw = packed[0] === 0x1f && packed[1] === 0x8b ? gunzipSync(packed) : packed;
  const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const dec = new TextDecoder();
  if (dec.decode(raw.subarray(0, 4)) !== 'DSA1') throw new Error('airport data is not the expected format');
  const count = dv.getUint32(4);
  const nc = dv.getUint16(8);
  const countries: string[] = [];
  for (let i = 0; i < nc; i++) countries.push(dec.decode(raw.subarray(10 + i * 2, 12 + i * 2)));
  let at = 10 + nc * 2;
  const all: AirportRec[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const lat = dv.getInt32(at) / 1e5;
    const lon = dv.getInt32(at + 4) / 1e5;
    const kind = dv.getUint8(at + 8);
    const country = countries[dv.getUint16(at + 9)] ?? '';
    const cl = dv.getUint8(at + 11);
    const code = dec.decode(raw.subarray(at + 12, at + 12 + cl));
    const nl = dv.getUint8(at + 12 + cl);
    const name = dec.decode(raw.subarray(at + 13 + cl, at + 13 + cl + nl));
    at += 13 + cl + nl;
    all[i] = { code, name, lat, lon, kind, country };
  }
  return { all };
}

export function countryCodes(db: AirportDb): string[] {
  return [...new Set(db.all.map(a => a.country))].sort();
}

export interface WorkingSet {
  list: AirportRec[];
  // where an auto set was built, so the caller knows when to rebuild
  around: Coord | null;
  label: string;
}

// the airports the app will look at, chosen by the settings
export function buildWorkingSet(
  db: AirportDb,
  mode: AirportsMode,
  country: string,
  here: Coord | null,
): WorkingSet {
  if (mode === 'world') return { list: db.all, around: null, label: 'whole world' };
  if (mode === 'country' && country) {
    const cc = country.toUpperCase();
    return { list: db.all.filter(a => a.country === cc), around: null, label: cc };
  }
  if (!here) return { list: [], around: null, label: 'waiting for location' };
  // a cheap box first, then the exact distance on what is left
  const dLat = AUTO_RADIUS_MI / 69;
  const dLon = dLat / Math.max(0.2, Math.cos((here.lat * Math.PI) / 180));
  const out: AirportRec[] = [];
  for (const a of db.all) {
    if (Math.abs(a.lat - here.lat) > dLat) continue;
    let dl = Math.abs(a.lon - here.lon);
    if (dl > 180) dl = 360 - dl;
    if (dl > dLon) continue;
    if (distanceMi(here, a) <= AUTO_RADIUS_MI) out.push(a);
  }
  return { list: out, around: here, label: `within ${AUTO_RADIUS_MI} mi` };
}

// true when an auto set no longer fits where the user is
export function needsRebuild(set: WorkingSet, mode: AirportsMode, here: Coord | null): boolean {
  if (mode !== 'auto' || !here) return false;
  if (!set.around) return true;
  return distanceMi(set.around, here) > AUTO_RELOAD_MI;
}

export interface NearOpts {
  // only large and medium airports, which is where airliners land
  commercialOnly?: boolean;
  count?: number;
}

// the nearest few, closest first
export function nearestAirports(set: WorkingSet, here: Coord, opts: NearOpts = {}): NearAirport[] {
  const n = opts.count ?? 5;
  const best: NearAirport[] = [];
  for (const a of set.list) {
    if (opts.commercialOnly && a.kind > 1) continue;
    // skip the exact distance when the cheap one already rules the airport out
    const rough = Math.abs(a.lat - here.lat) * 69;
    if (best.length === n && rough > best[n - 1]!.distMi) continue;
    const d = distanceMi(here, a);
    if (best.length < n || d < best[best.length - 1]!.distMi) {
      best.push({ ...a, distMi: d, bearingDeg: bearingDeg(here, a) });
      best.sort((x, y) => x.distMi - y.distMi);
      if (best.length > n) best.pop();
    }
  }
  return best;
}

export function describeSet(set: WorkingSet): string {
  return `${set.list.length.toLocaleString('en-US')} airports (${set.label})`;
}

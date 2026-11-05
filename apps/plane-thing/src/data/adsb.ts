import { airlineFromCallsign, isHeliType } from './airlines';
import { bearingDeg, distanceMi } from './geo';
import type { Aircraft, Coord } from './types';
import { titleCase } from './format';

// providers, in the order they are tried. all three share the readsb json shape
export type ProviderId = 'adsblol' | 'airplaneslive' | 'adsbfi';

export const PROVIDER_NAMES: Record<ProviderId, string> = {
  adsblol: 'adsb.lol',
  airplaneslive: 'airplanes.live',
  adsbfi: 'adsb.fi',
};

export const NEARBY_ORDER: ProviderId[] = ['adsblol', 'airplaneslive', 'adsbfi'];
// only these have a lookup by squawk code
export const SQUAWK_ORDER: ProviderId[] = ['airplaneslive', 'adsbfi', 'adsblol'];

const MI_PER_NM = 1.150779;

// two decimals is about 1 km, which is all the service needs and all it is sent
const r2 = (n: number) => n.toFixed(2);

export function nearbyUrl(p: ProviderId, c: Coord, radiusNm: number): string {
  const nm = Math.max(1, Math.min(250, Math.round(radiusNm)));
  switch (p) {
    case 'adsblol':
      return `https://api.adsb.lol/v2/point/${r2(c.lat)}/${r2(c.lon)}/${nm}`;
    case 'airplaneslive':
      return `https://api.airplanes.live/v2/point/${r2(c.lat)}/${r2(c.lon)}/${nm}`;
    case 'adsbfi':
      return `https://opendata.adsb.fi/api/v3/lat/${r2(c.lat)}/lon/${r2(c.lon)}/dist/${nm}`;
  }
}

export function squawkUrl(p: ProviderId, code: string): string {
  switch (p) {
    case 'airplaneslive':
      return `https://api.airplanes.live/v2/squawk/${code}`;
    case 'adsbfi':
      return `https://opendata.adsb.fi/api/v2/sqk/${code}`;
    default:
      return `https://api.adsb.lol/v2/sqk/${code}`;
  }
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t : null;
};

const COMPANY_TAIL = /\b(INC|LLC|LTD|CORP|CORPORATION|CO|COMPANY|PLC|LP|TRUSTEE|TRUST)\b\.?,?/gi;

// owner names come in capitals with legal endings: "DELTA AIR LINES INC" becomes "Delta Air Lines"
export function cleanOperator(s: string | null): string | null {
  if (!s) return null;
  const t = s
    .replace(COMPANY_TAIL, '')
    .replace(/[,.]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return null;
  return t === t.toUpperCase() ? titleCase(t) : t;
}

export function cleanType(desc: string | null): string | null {
  if (!desc) return null;
  return desc === desc.toUpperCase() ? titleCase(desc) : desc;
}

// one raw readsb object. returns null when it has no usable position
export function parseReadsb(raw: unknown, me: Coord): Aircraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const hex = str(o.hex)?.toLowerCase().replace(/^~/, '');
  const lat = num(o.lat) ?? num((o.lastPosition as Record<string, unknown> | undefined)?.lat);
  const lon = num(o.lon) ?? num((o.lastPosition as Record<string, unknown> | undefined)?.lon);
  if (!hex || lat === null || lon === null) return null;
  const alt = o.alt_baro;
  const onGround = alt === 'ground';
  const altFt = onGround ? 0 : (num(alt) ?? num(o.alt_geom));
  const callsign = str(o.flight)?.toUpperCase() ?? null;
  const here = { lat, lon };
  const dbFlags = num(o.dbFlags) ?? 0;
  return {
    hex,
    reg: str(o.r)?.toUpperCase() ?? null,
    callsign,
    type: str(o.t)?.toUpperCase() ?? null,
    desc: cleanType(str(o.desc)),
    operator: airlineFromCallsign(callsign) ?? cleanOperator(str(o.ownOp)),
    lat,
    lon,
    altFt,
    onGround,
    gsKt: num(o.gs),
    trackDeg: num(o.track) ?? num(o.true_heading) ?? num(o.mag_heading),
    vertFpm: num(o.baro_rate) ?? num(o.geom_rate),
    squawk: str(o.squawk),
    category: str(o.category),
    military: (dbFlags & 1) === 1,
    seenPosS: num(o.seen_pos) ?? num(o.seen) ?? 0,
    distMi: distanceMi(me, here),
    bearingDeg: bearingDeg(me, here),
  };
}

export function parseReadsbList(json: unknown, me: Coord): Aircraft[] {
  if (!json || typeof json !== 'object') throw new Error('reply was not readable');
  const j = json as Record<string, unknown>;
  const list = Array.isArray(j.ac) ? j.ac : Array.isArray(j.aircraft) ? j.aircraft : null;
  if (!list) throw new Error('reply had no aircraft list');
  const out: Aircraft[] = [];
  for (const raw of list) {
    const a = parseReadsb(raw, me);
    if (a) out.push(a);
  }
  return out;
}

export function parseProvider(_p: ProviderId, json: unknown, me: Coord): Aircraft[] {
  return parseReadsbList(json, me);
}

export function isHelicopter(a: Pick<Aircraft, 'category' | 'type'>): boolean {
  return a.category === 'A7' || isHeliType(a.type);
}

// ground vehicles and fixed obstacles show up as emitters too. they are not aircraft
export function isAircraftLike(a: Pick<Aircraft, 'category'>): boolean {
  return !a.category || !/^C/.test(a.category);
}

// recompute the observer relative numbers after the observer moved
export function relocate(a: Aircraft, me: Coord): Aircraft {
  const here = { lat: a.lat, lon: a.lon };
  return { ...a, distMi: distanceMi(me, here), bearingDeg: bearingDeg(me, here) };
}

// a position that moves along the track with time since the last report, for smooth drawing
export function advance(a: Aircraft, seconds: number): Coord {
  if (a.onGround || a.gsKt === null || a.trackDeg === null || seconds <= 0) return { lat: a.lat, lon: a.lon };
  const miles = (a.gsKt * MI_PER_NM * seconds) / 3600;
  const t = (a.trackDeg * Math.PI) / 180;
  const dLat = (miles * Math.cos(t)) / 69;
  const dLon = (miles * Math.sin(t)) / (69 * Math.max(0.2, Math.cos((a.lat * Math.PI) / 180)));
  return { lat: a.lat + dLat, lon: a.lon + dLon };
}

// the airline and aircraft pairing used to find a photo of a sister ship
export function fleetKey(a: Pick<Aircraft, 'callsign' | 'type'>): string | null {
  const m = a.callsign ? /^([A-Z]{3})\d/.exec(a.callsign) : null;
  return m && a.type ? `${m[1]}:${a.type}` : null;
}

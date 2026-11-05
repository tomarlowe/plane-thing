import type { Aircraft } from './types';

// an estimated route from the callsign, such as ATL to LGA. the lookup is adsb.lol's route service. airlines change
// flights, so it is always shown as an estimate
export interface RouteGuess {
  from: string;
  to: string;
}

export const ROUTE_URL = 'https://api.adsb.lol/api/0/routeset';

export function routeBody(list: Aircraft[]): Uint8Array {
  const planes = list.map(a => ({ callsign: a.callsign, lat: a.lat, lng: a.lon }));
  return new TextEncoder().encode(JSON.stringify({ planes }));
}

const code = (o: unknown): string | null => {
  const r = o as { iata?: unknown; icao?: unknown } | null;
  const v = typeof r?.iata === 'string' && r.iata ? r.iata : typeof r?.icao === 'string' && r.icao ? r.icao : null;
  return v ? v.toUpperCase() : null;
};

export function parseRouteItem(item: unknown): RouteGuess | null {
  if (!item || typeof item !== 'object') return null;
  const r = item as Record<string, unknown>;
  if (r.plausible === false) return null;
  const ports = r._airports;
  if (Array.isArray(ports) && ports.length >= 2) {
    const from = code(ports[0]);
    const to = code(ports[ports.length - 1]);
    if (from && to) return { from, to };
  }
  const text = typeof r._airport_codes_iata === 'string' ? r._airport_codes_iata : typeof r.airport_codes === 'string' ? r.airport_codes : null;
  const bits = text?.split('-').filter(Boolean);
  if (bits && bits.length >= 2) return { from: bits[0]!.toUpperCase(), to: bits[bits.length - 1]!.toUpperCase() };
  return null;
}

// only worth asking for airline style callsigns
export const wantsRoute = (a: Aircraft) => !!a.callsign && /^[A-Z]{3}\d{1,4}[A-Z]?$/.test(a.callsign);

// the reply is a list with one entry per aircraft asked about, each naming its callsign
export function parseRouteSet(json: unknown): Map<string, RouteGuess | null> {
  const out = new Map<string, RouteGuess | null>();
  const list = Array.isArray(json) ? json : json && typeof json === 'object' ? [json] : [];
  for (const item of list) {
    const callsign = (item as { callsign?: unknown })?.callsign;
    if (typeof callsign === 'string') out.set(callsign.trim().toUpperCase(), parseRouteItem(item));
  }
  return out;
}

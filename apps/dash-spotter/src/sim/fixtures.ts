// SIMULATED data for the offline simulator, the screenshots and the tests. every aircraft here is invented: the tail
// numbers, callsigns, hex codes, photographers and delays are made up and do not describe real flights. the reply
// shapes follow the published formats of the real services, which is what the parsers are checked against.
// a real service can differ from these, so passing here does not prove the app works against the live ones

import { destination, distanceMi } from '../data/geo';
import type { Coord } from '../data/types';

// near Hoboken NJ, so JFK is about 15 miles to the east-southeast
export const SIM_COORD: Coord = { lat: 40.744, lon: -74.032 };
// Wednesday 2026-11-04 2:41 PM New York time (standard time, UTC-5)
export const SIM_NOW_S = 1793821260;
export const SIM_OFFSET_S = -5 * 3600;

export const JFK: Coord = { lat: 40.6398, lon: -73.7789 };

export type Scenario = 'normal' | 'empty' | 'emergency' | 'fleet';

export interface SimAircraft {
  hex: string;
  flight: string | null;
  r: string | null;
  t: string;
  desc: string;
  category: string;
  // where it starts, relative to the user, or around JFK when around is set
  distMi: number;
  bearingDeg: number;
  around?: 'jfk';
  track: number;
  gs: number;
  alt: number;
  rate: number;
  squawk: string;
  // seconds after the start before it exists, and its squawk before it changes
  appearS?: number;
  dbFlags?: number;
  ownOp?: string;
}

// the first group is the neighbourhood of the Overhead and Radar mockups, the second flies into JFK, the third is far
export const FLEET: SimAircraft[] = [
  { hex: 'a1c001', flight: 'DAL1482', r: 'N372DN', t: 'A321', desc: 'AIRBUS A-321', category: 'A3', distMi: 2.3, bearingDeg: 45, track: 264, gs: 212, alt: 3400, rate: -700, squawk: '3421' },
  { hex: 'a1c002', flight: null, r: 'N412NY', t: 'B407', desc: 'BELL 407', category: 'A7', distMi: 4.5, bearingDeg: 158, track: 340, gs: 78, alt: 900, rate: 0, squawk: '1200', ownOp: 'EXAMPLE HELICOPTERS LLC' },
  { hex: 'a1c003', flight: 'SWA1507', r: 'N8702L', t: 'B738', desc: 'BOEING 737-800', category: 'A3', distMi: 5.8, bearingDeg: 292, track: 80, gs: 190, alt: 4100, rate: -600, squawk: '4216' },
  { hex: 'a1c004', flight: 'EDV5231', r: 'N302PQ', t: 'CRJ9', desc: 'BOMBARDIER CRJ-900', category: 'A3', distMi: 8.5, bearingDeg: 248, track: 250, gs: 168, alt: 2600, rate: 800, squawk: '5301' },
  { hex: 'a1c005', flight: 'AAL2074', r: 'N152AN', t: 'A21N', desc: 'AIRBUS A-321NEO', category: 'A3', distMi: 9.5, bearingDeg: 92, track: 250, gs: 276, alt: 11000, rate: -1500, squawk: '2615' },
  { hex: 'a1c006', flight: 'UAL2210', r: 'N77865', t: 'B739', desc: 'BOEING 737-900', category: 'A3', distMi: 11, bearingDeg: 202, track: 40, gs: 301, alt: 12500, rate: 1200, squawk: '3014' },
  { hex: 'a1c007', flight: 'SKW5412', r: 'N211SY', t: 'E175', desc: 'EMBRAER ERJ-175', category: 'A3', distMi: 18, bearingDeg: 225, track: 90, gs: 400, alt: 31000, rate: 0, squawk: '6047' },
  { hex: 'a1c008', flight: 'JBU1061', r: 'N581JB', t: 'A320', desc: 'AIRBUS A-320', category: 'A3', distMi: 3.9, bearingDeg: 120, track: 238, gs: 238, alt: 6200, rate: -900, squawk: '4501' },
  { hex: 'a1c0f1', flight: 'JBU1062', r: 'N7821J', t: 'A320', desc: 'AIRBUS A-320', category: 'A3', distMi: 12, bearingDeg: 150, track: 60, gs: 250, alt: 9000, rate: 0, squawk: '4502' },
  // arriving at JFK
  { hex: 'a1c101', flight: 'JBU615', r: 'N709JB', t: 'A320', desc: 'AIRBUS A-320', category: 'A3', distMi: 9.2, bearingDeg: 95, around: 'jfk', track: 275, gs: 150, alt: 3100, rate: -700, squawk: '4122' },
  { hex: 'a1c102', flight: 'DAL1132', r: 'N384DN', t: 'A321', desc: 'AIRBUS A-321', category: 'A3', distMi: 21, bearingDeg: 60, around: 'jfk', track: 240, gs: 255, alt: 9800, rate: -1800, squawk: '3355' },
  { hex: 'a1c103', flight: 'AAL1470', r: 'N929NN', t: 'B738', desc: 'BOEING 737-800', category: 'A3', distMi: 34, bearingDeg: 355, around: 'jfk', track: 160, gs: 320, alt: 17000, rate: -2100, squawk: '2147' },
  // far away
  { hex: 'a1c201', flight: 'FDX3321', r: 'N631FE', t: 'B77L', desc: 'BOEING 777-F', category: 'A5', distMi: 52, bearingDeg: 280, track: 90, gs: 430, alt: 36000, rate: 0, squawk: '2201' },
  { hex: 'a1c202', flight: 'UAE202', r: 'A6-EWA', t: 'A388', desc: 'AIRBUS A-380-800', category: 'A5', distMi: 70, bearingDeg: 20, track: 250, gs: 470, alt: 38000, rate: 0, squawk: '2455' },
  // the emergency, 55 miles north-northwest and heading toward the area
  { hex: 'a1c301', flight: 'SWA2209', r: 'N9021A', t: 'B738', desc: 'BOEING 737-800', category: 'A3', distMi: 55, bearingDeg: 340, track: 160, gs: 360, alt: 31000, rate: -1000, squawk: '7700', appearS: 0 },
  // an aircraft the user can put on a list by flag: a military transport
  { hex: 'ae0001', flight: 'RCH451', r: '08-8191', t: 'C17', desc: 'BOEING C-17A Globemaster III', category: 'A5', distMi: 26, bearingDeg: 310, track: 120, gs: 330, alt: 14000, rate: -600, squawk: '4400', dbFlags: 1 },
];

// a sister ship of JBU1061 with a photo, for the scenario where the nearest aircraft has none of its own
export const SISTER_HEX = 'a1c0f1';

// aircraft per scenario. the emergency scenario shows the squawk after its delay, the empty one leaves nothing close
export function visible(scenario: Scenario, tSec: number, emergencyAfterS: number): SimAircraft[] {
  return FLEET.filter(a => {
    if (scenario === 'empty' && a.distMi < 15 && !a.around) return false;
    if (scenario === 'fleet' && a.hex === 'a1c001') return false;
    if (a.squawk === '7700') return scenario === 'emergency' && tSec >= emergencyAfterS;
    return true;
  });
}

export interface Placed extends SimAircraft {
  lat: number;
  lon: number;
  nowAlt: number;
}

export function place(a: SimAircraft, tSec: number): Placed {
  const origin = a.around === 'jfk' ? JFK : SIM_COORD;
  const start = destination(origin, a.bearingDeg, a.distMi);
  const miles = (a.gs * 1.150779 * tSec) / 3600;
  const p = tSec > 0 ? destination(start, a.track, miles) : start;
  const nowAlt = Math.max(0, a.alt + (a.rate * tSec) / 60);
  return { ...a, lat: p.lat, lon: p.lon, nowAlt };
}

// a readsb style object, as the three community services send them
export function readsbObject(p: Placed): Record<string, unknown> {
  const o: Record<string, unknown> = {
    hex: p.hex,
    type: 'adsb_icao',
    r: p.r,
    t: p.t,
    desc: p.desc,
    alt_baro: Math.round(p.nowAlt / 25) * 25,
    gs: p.gs,
    track: p.track,
    baro_rate: p.rate,
    squawk: p.squawk,
    category: p.category,
    lat: p.lat,
    lon: p.lon,
    seen_pos: 1,
    seen: 0.4,
    dbFlags: p.dbFlags ?? 0,
  };
  if (p.flight) o.flight = p.flight.padEnd(8, ' ');
  if (p.ownOp) o.ownOp = p.ownOp;
  return o;
}

export function pointReply(list: Placed[], center: Coord, radiusNm: number, nowS: number, v3: boolean): unknown {
  const within = list.filter(p => distanceMi(center, p) <= radiusNm * 1.150779);
  const objs = within.map(readsbObject);
  return v3 ? { aircraft: objs, now: nowS * 1000, total: objs.length } : { ac: objs, msg: 'No error', now: nowS * 1000, total: objs.length, ptime: 1 };
}

export function squawkReply(list: Placed[], code: string, nowS: number, v3: boolean): unknown {
  const objs = list.filter(p => p.squawk === code).map(readsbObject);
  return v3 ? { aircraft: objs, now: nowS * 1000, total: objs.length } : { ac: objs, msg: 'No error', now: nowS * 1000, total: objs.length };
}

// the FAA feed is xml. a ground delay program at JFK, as in the approved Arrivals mockup
export function faaXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<AIRPORT_STATUS_INFORMATION>
  <Update_Time>Wed Nov 04 19:40:00 2026 GMT</Update_Time>
  <Dtd_Version>2.0</Dtd_Version>
  <Delay_type>
    <Name>Ground Delay Programs</Name>
    <Ground_Delay_List>
      <Ground_Delay>
        <ARPT>JFK</ARPT>
        <Reason>low ceilings</Reason>
        <Avg>45 minutes</Avg>
        <Max>1 hour and 12 minutes</Max>
      </Ground_Delay>
    </Ground_Delay_List>
  </Delay_type>
</AIRPORT_STATUS_INFORMATION>`;
}

export const SIM_ROUTES: Record<string, [string, string]> = {
  DAL1482: ['ATL', 'LGA'],
  JBU1061: ['FLL', 'LGA'],
  SWA1507: ['MDW', 'EWR'],
  AAL2074: ['DFW', 'LGA'],
  UAL2210: ['IAH', 'EWR'],
  JBU615: ['BOS', 'JFK'],
  DAL1132: ['ATL', 'JFK'],
  AAL1470: ['MIA', 'JFK'],
  SWA2209: ['DEN', 'BWI'],
};

export function routeReply(callsigns: string[]): unknown {
  return callsigns.map(c => {
    const r = SIM_ROUTES[c];
    return r
      ? { callsign: c, _airport_codes_iata: `${r[0]}-${r[1]}`, _airports: [{ iata: r[0] }, { iata: r[1] }], plausible: true }
      : { callsign: c, plausible: false };
  });
}

export function planespottersReply(hit: boolean, photographer: string): unknown {
  if (!hit) return { photos: [] };
  return {
    photos: [
      {
        id: 'sim-1',
        thumbnail: { src: 'https://t.sim.invalid/small.jpg', size: { width: 200, height: 133 } },
        thumbnail_large: { src: 'https://t.sim.invalid/large.jpg', size: { width: 420, height: 280 } },
        link: 'https://www.planespotters.net/photo/sim-1',
        photographer,
      },
    ],
  };
}

export function airportDataReply(): unknown {
  return { status: 200, count: 0, data: [] };
}

export function commonsReply(hit: boolean): unknown {
  if (!hit) return { batchcomplete: true };
  return {
    batchcomplete: true,
    query: {
      pages: [
        {
          pageid: 1,
          title: 'File:Sim airliner.jpg',
          imageinfo: [
            {
              thumburl: 'https://t.sim.invalid/type.jpg',
              descriptionurl: 'https://commons.wikimedia.org/wiki/File:Sim_airliner.jpg',
              mime: 'image/jpeg',
              extmetadata: { Artist: { value: 'Sample Artist' }, LicenseShortName: { value: 'CC BY-SA 4.0' } },
            },
          ],
        },
      ],
    },
  };
}

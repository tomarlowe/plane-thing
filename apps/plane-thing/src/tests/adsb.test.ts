// SIMULATED reply shapes written from memory of the published formats. a real service can differ, so these prove the
// parsers handle what they were written for, not that the live services answer this way
import { describe, expect, test } from 'bun:test';
import {
  advance,
  cleanOperator,
  cleanType,
  fleetKey,
  isAircraftLike,
  isHelicopter,
  nearbyUrl,
  parseReadsb,
  parseReadsbList,
  squawkUrl,
} from '../data/adsb';
import { airlineFromCallsign, isHeliType } from '../data/airlines';
import { bearingDeg, distanceMi } from '../data/geo';

const me = { lat: 40.744, lon: -74.032 };
const raw = {
  hex: 'a1b2c3',
  flight: 'DAL1482 ',
  r: 'n372dn',
  t: 'a321',
  desc: 'AIRBUS A-321',
  alt_baro: 3400,
  gs: 212,
  track: 264,
  baro_rate: -700,
  squawk: '3421',
  category: 'A3',
  lat: 40.76,
  lon: -74.0,
  seen_pos: 1.2,
  dbFlags: 1,
};

describe('readsb aircraft', () => {
  test('reads every field and works out distance and bearing', () => {
    const a = parseReadsb(raw, me)!;
    expect(a.hex).toBe('a1b2c3');
    expect(a.callsign).toBe('DAL1482');
    expect(a.reg).toBe('N372DN');
    expect(a.type).toBe('A321');
    expect(a.desc).toBe('Airbus A-321');
    expect(a.operator).toBe('Delta Air Lines');
    expect(a.altFt).toBe(3400);
    expect(a.onGround).toBe(false);
    expect(a.gsKt).toBe(212);
    expect(a.trackDeg).toBe(264);
    expect(a.vertFpm).toBe(-700);
    expect(a.squawk).toBe('3421');
    expect(a.military).toBe(true);
    expect(a.seenPosS).toBe(1.2);
    expect(a.distMi).toBeCloseTo(distanceMi(me, { lat: 40.76, lon: -74.0 }), 6);
    expect(a.bearingDeg).toBeCloseTo(bearingDeg(me, { lat: 40.76, lon: -74.0 }), 6);
  });
  test('ground, tisb hex and last position', () => {
    expect(parseReadsb({ ...raw, alt_baro: 'ground' }, me)!.onGround).toBe(true);
    expect(parseReadsb({ ...raw, alt_baro: 'ground' }, me)!.altFt).toBe(0);
    expect(parseReadsb({ ...raw, hex: '~abc123' }, me)!.hex).toBe('abc123');
    const lp = parseReadsb({ hex: 'a1', lastPosition: { lat: 40.8, lon: -74.1 } }, me)!;
    expect(lp.lat).toBe(40.8);
    expect(lp.altFt).toBeNull();
  });
  test('no position or no hex means no aircraft', () => {
    expect(parseReadsb({ hex: 'a1' }, me)).toBeNull();
    expect(parseReadsb({ lat: 1, lon: 1 }, me)).toBeNull();
    expect(parseReadsb(null, me)).toBeNull();
    expect(parseReadsb('x', me)).toBeNull();
  });
  test('lists in either key, and an unreadable reply throws', () => {
    expect(parseReadsbList({ ac: [raw, { hex: 'zz' }] }, me)).toHaveLength(1);
    expect(parseReadsbList({ aircraft: [raw] }, me)).toHaveLength(1);
    expect(parseReadsbList({ ac: [] }, me)).toHaveLength(0);
    expect(() => parseReadsbList({}, me)).toThrow();
    expect(() => parseReadsbList(null, me)).toThrow();
  });
});

describe('names and helpers', () => {
  test('owner names are tidied', () => {
    expect(cleanOperator('DELTA AIR LINES INC')).toBe('Delta Air Lines');
    expect(cleanOperator('Acme Aviation LLC')).toBe('Acme Aviation');
    expect(cleanOperator('LLC')).toBeNull();
    expect(cleanOperator(null)).toBeNull();
    expect(cleanType('AIRBUS A-321')).toBe('Airbus A-321');
    expect(cleanType('Airbus A321neo')).toBe('Airbus A321neo');
  });
  test('airlines, helicopters and ground vehicles', () => {
    expect(airlineFromCallsign('DAL1482')).toBe('Delta Air Lines');
    expect(airlineFromCallsign('N123AB')).toBeNull();
    expect(isHeliType('B407')).toBe(true);
    expect(isHeliType('A320')).toBe(false);
    // the MD-90 is an airliner, not a helicopter
    expect(isHeliType('MD90')).toBe(false);
    expect(isHelicopter({ category: 'A7', type: null })).toBe(true);
    expect(isHelicopter({ category: 'A3', type: 'R44' })).toBe(true);
    expect(isAircraftLike({ category: 'C1' })).toBe(false);
    expect(isAircraftLike({ category: null })).toBe(true);
  });
  test('fleet key needs an airline callsign and a type', () => {
    expect(fleetKey({ callsign: 'DAL1482', type: 'A321' })).toBe('DAL:A321');
    expect(fleetKey({ callsign: null, type: 'A321' })).toBeNull();
    expect(fleetKey({ callsign: 'N123AB', type: 'A321' })).toBeNull();
  });
  test('an aircraft is moved along its track between reports', () => {
    const a = parseReadsb({ ...raw, track: 90, gs: 360, lat: 40, lon: -74 }, { lat: 40, lon: -74 })!;
    const p = advance(a, 60);
    // 360 knots for a minute is about 6.9 statute miles
    expect(distanceMi({ lat: 40, lon: -74 }, p)).toBeCloseTo(6.9, 1);
    expect(bearingDeg({ lat: 40, lon: -74 }, p)).toBeCloseTo(90, 0);
    expect(advance({ ...a, onGround: true }, 60)).toEqual({ lat: 40, lon: -74 });
  });
});

describe('request addresses', () => {
  test('nearby searches', () => {
    expect(nearbyUrl('adsblol', me, 15)).toBe('https://api.adsb.lol/v2/point/40.74/-74.03/15');
    expect(nearbyUrl('airplaneslive', me, 15)).toBe('https://api.airplanes.live/v2/point/40.74/-74.03/15');
    expect(nearbyUrl('adsbfi', me, 15)).toBe('https://opendata.adsb.fi/api/v3/lat/40.74/lon/-74.03/dist/15');
  });
  test('the radius is kept between 1 and 250 nautical miles', () => {
    expect(nearbyUrl('adsblol', me, 0)).toEndWith('/1');
    expect(nearbyUrl('adsblol', me, 9999)).toEndWith('/250');
  });
  test('squawk lookups', () => {
    expect(squawkUrl('airplaneslive', '7700')).toBe('https://api.airplanes.live/v2/squawk/7700');
    expect(squawkUrl('adsbfi', '7700')).toBe('https://opendata.adsb.fi/api/v2/sqk/7700');
    expect(squawkUrl('adsblol', '7700')).toBe('https://api.adsb.lol/v2/sqk/7700');
  });
});

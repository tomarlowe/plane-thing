// uses the real airport file that ships in the app (OurAirports data). the working set rules are checked here
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { COUNTRIES } from '../../settings/countries';
import {
  AUTO_RADIUS_MI,
  buildWorkingSet,
  countryCodes,
  decodeAirports,
  describeSet,
  needsRebuild,
  nearestAirports,
} from '../data/airports';
import { distanceMi } from '../data/geo';

const db = decodeAirports(new Uint8Array(readFileSync(new URL('../data/airports.bin.gz', import.meta.url))));
const hoboken = { lat: 40.744, lon: -74.032 };

describe('airport file', () => {
  test('decodes the whole world', () => {
    expect(db.all.length).toBeGreaterThan(70000);
    const jfk = db.all.find(a => a.code === 'JFK')!;
    expect(jfk.name).toBe('John F. Kennedy International Airport');
    expect(jfk.kind).toBe(0);
    expect(jfk.country).toBe('US');
    expect(distanceMi(jfk, { lat: 40.6398, lon: -73.7789 })).toBeLessThan(0.5);
  });
  test('rejects a file that is not an airport file', () => {
    expect(() => decodeAirports(new TextEncoder().encode('not an airport file at all'))).toThrow();
  });
  test('private strips and heliports are kept', () => {
    expect(db.all.some(a => a.kind === 3)).toBe(true);
    expect(db.all.some(a => a.code === '91NJ')).toBe(true);
  });
  test('the country list on the settings page matches the file', () => {
    expect(COUNTRIES.map(c => c[0]).sort()).toEqual(countryCodes(db));
  });
});

describe('working sets', () => {
  test('auto looks only within 250 miles of the user', () => {
    const set = buildWorkingSet(db, 'auto', '', hoboken);
    expect(set.list.length).toBeGreaterThan(500);
    expect(set.list.length).toBeLessThan(5000);
    expect(set.list.every(a => distanceMi(hoboken, a) <= AUTO_RADIUS_MI)).toBe(true);
    expect(describeSet(set)).toContain('within 250 mi');
  });
  test('auto without a position waits', () => {
    const set = buildWorkingSet(db, 'auto', '', null);
    expect(set.list).toHaveLength(0);
    expect(set.label).toBe('waiting for location');
  });
  test('a country uses only that country, in any letter case', () => {
    const set = buildWorkingSet(db, 'country', 'gb', hoboken);
    expect(set.list.length).toBeGreaterThan(100);
    expect(set.list.every(a => a.country === 'GB')).toBe(true);
    expect(set.list.some(a => a.code === 'LHR')).toBe(true);
  });
  test('a country mode with no code falls back to near me', () => {
    expect(buildWorkingSet(db, 'country', '', hoboken).list.length).toBe(buildWorkingSet(db, 'auto', '', hoboken).list.length);
  });
  test('world uses everything', () => {
    expect(buildWorkingSet(db, 'world', '', hoboken).list.length).toBe(db.all.length);
  });
  test('the set is rebuilt after moving 100 miles, only in auto mode', () => {
    const set = buildWorkingSet(db, 'auto', '', hoboken);
    expect(needsRebuild(set, 'auto', { lat: 40.8, lon: -74 })).toBe(false);
    expect(needsRebuild(set, 'auto', { lat: 42.5, lon: -74 })).toBe(true);
    expect(needsRebuild(set, 'world', { lat: 42.5, lon: -74 })).toBe(false);
  });
});

describe('nearest airports', () => {
  const set = buildWorkingSet(db, 'auto', '', hoboken);
  test('any kind includes small heliports, nearest first', () => {
    const near = nearestAirports(set, hoboken, { count: 3 });
    expect(near).toHaveLength(3);
    expect(near[0]!.distMi).toBeLessThanOrEqual(near[1]!.distMi);
    expect(near[0]!.kind).toBeGreaterThanOrEqual(2);
  });
  test('commercial only gives large and medium airports', () => {
    const near = nearestAirports(set, hoboken, { commercialOnly: true, count: 5 });
    expect(near.map(a => a.code).slice(0, 4)).toEqual(['TEB', 'EWR', 'LGA', 'JFK']);
    expect(near.every(a => a.kind <= 1)).toBe(true);
  });
  test('JFK is east-southeast of Hoboken', () => {
    const jfk = nearestAirports(set, hoboken, { commercialOnly: true, count: 5 }).find(a => a.code === 'JFK')!;
    expect(jfk.distMi).toBeGreaterThan(14);
    expect(jfk.distMi).toBeLessThan(16);
    expect(jfk.bearingDeg).toBeGreaterThan(100);
    expect(jfk.bearingDeg).toBeLessThan(125);
  });
});

// SIMULATED aircraft written for the tests
import { describe, expect, test } from 'bun:test';
import { ALERT_RADIUS_MI, EmergencyTracker, rangeFor } from '../data/emergency';
import { matchesWatch, nearestHelicopter, nearestWatched, parseWatch } from '../data/watch';
import type { Aircraft } from '../data/types';

const ac = (o: Partial<Aircraft> = {}): Aircraft => ({
  hex: 'a1b2c3',
  reg: 'N372DN',
  callsign: 'DAL1482',
  type: 'A321',
  desc: 'Airbus A-321',
  operator: 'Delta Air Lines',
  lat: 40.8,
  lon: -74,
  altFt: 31000,
  onGround: false,
  gsKt: 400,
  trackDeg: 90,
  vertFpm: 0,
  squawk: '1200',
  category: 'A3',
  military: false,
  seenPosS: 1,
  distMi: 30,
  bearingDeg: 10,
  ...o,
});

describe('emergency tracker', () => {
  test('one sighting is not enough, a second one four seconds later confirms', () => {
    const t = new EmergencyTracker();
    expect(t.observe(1000, [ac({ squawk: '7700' })])).toHaveLength(0);
    expect(t.hasPending(1001)).toBe(true);
    expect(t.observe(1002, [ac({ squawk: '7700' })])).toHaveLength(0);
    const fresh = t.observe(1005, [ac({ squawk: '7700' })]);
    expect(fresh).toHaveLength(1);
    expect(fresh[0]!.code).toBe('7700');
    expect(fresh[0]!.label).toBe('General emergency');
    expect(t.active(1006)).toHaveLength(1);
  });
  test('it alerts once, not on every update', () => {
    const t = new EmergencyTracker();
    t.observe(1000, [ac({ squawk: '7600' })]);
    expect(t.observe(1030, [ac({ squawk: '7600' })])).toHaveLength(1);
    expect(t.observe(1060, [ac({ squawk: '7600' })])).toHaveLength(0);
  });
  test('a pilot dialling through a code does not alert', () => {
    const t = new EmergencyTracker();
    t.observe(1000, [ac({ squawk: '7700' })]);
    // the code changes to something else before the second look
    expect(t.observe(1030, [ac({ squawk: '7000' })])).toHaveLength(0);
    expect(t.active(1031)).toHaveLength(0);
  });
  test('only the three emergency codes count, within 100 miles, in the air', () => {
    const t = new EmergencyTracker();
    const list = [
      ac({ hex: '01', squawk: '7500' }),
      ac({ hex: '02', squawk: '7777' }),
      ac({ hex: '03', squawk: '7700', distMi: ALERT_RADIUS_MI + 1 }),
      ac({ hex: '04', squawk: '7700', onGround: true }),
    ];
    t.observe(1000, list);
    const fresh = t.observe(1010, list);
    expect(fresh.map(f => f.hex)).toEqual(['01']);
  });
  test('an emergency stays listed for three minutes, then drops off', () => {
    const t = new EmergencyTracker();
    t.observe(1000, [ac({ squawk: '7700' })]);
    t.observe(1010, [ac({ squawk: '7700' })]);
    expect(t.active(1100)).toHaveLength(1);
    expect(t.active(1200)).toHaveLength(0);
  });
  test('a new episode after ten quiet minutes can alert again', () => {
    const t = new EmergencyTracker();
    t.observe(1000, [ac({ squawk: '7700' })]);
    expect(t.observe(1010, [ac({ squawk: '7700' })])).toHaveLength(1);
    t.observe(1700, []);
    t.observe(2000, [ac({ squawk: '7700' })]);
    expect(t.observe(2010, [ac({ squawk: '7700' })])).toHaveLength(1);
  });
  test('active emergencies come nearest first', () => {
    const t = new EmergencyTracker();
    const list = [ac({ hex: 'aa', squawk: '7700', distMi: 60 }), ac({ hex: 'bb', squawk: '7600', distMi: 20 })];
    t.observe(1000, list);
    t.observe(1010, list);
    expect(t.active(1011).map(e => e.hex)).toEqual(['bb', 'aa']);
  });
  test('the jump to radar picks the smallest range with room to spare', () => {
    expect(rangeFor(2)).toBe(3);
    expect(rangeFor(2.8)).toBe(6);
    expect(rangeFor(5)).toBe(6);
    expect(rangeFor(10)).toBe(15);
    expect(rangeFor(14)).toBe(50);
    expect(rangeFor(45)).toBe(50);
    expect(rangeFor(60)).toBe(100);
    expect(rangeFor(250)).toBe(100);
  });
});

describe('watch list', () => {
  test('text is split, upper cased and de-duplicated', () => {
    expect(parseWatch('dal, n123ab; a388 ae01ce\nmil dal')).toEqual(['DAL', 'N123AB', 'A388', 'AE01CE', 'MIL']);
    expect(parseWatch('a')).toEqual([]);
    expect(parseWatch('')).toEqual([]);
  });
  test('a token matches tail, hex, type, callsign start or military', () => {
    expect(matchesWatch(ac(), ['N372DN'])).toBe('N372DN');
    expect(matchesWatch(ac({ reg: 'A6-EWA' }), ['A6EWA'])).toBe('A6EWA');
    expect(matchesWatch(ac(), ['A1B2C3'])).toBe('A1B2C3');
    expect(matchesWatch(ac(), ['A321'])).toBe('A321');
    expect(matchesWatch(ac(), ['DAL'])).toBe('DAL');
    expect(matchesWatch(ac(), ['DAL14'])).toBe('DAL14');
    expect(matchesWatch(ac({ military: true }), ['MIL'])).toBe('MIL');
    expect(matchesWatch(ac(), ['MIL'])).toBeNull();
    expect(matchesWatch(ac(), ['UAL'])).toBeNull();
  });
  test('a two letter token does not match the start of a callsign', () => {
    expect(matchesWatch(ac(), ['DA'])).toBeNull();
  });
  test('nearest watched and nearest helicopter', () => {
    const list = [ac({ hex: '01', distMi: 12 }), ac({ hex: '02', distMi: 4 }), ac({ hex: '03', distMi: 2, callsign: 'UAL1', type: 'B739' })];
    expect(nearestWatched(list, ['DAL'])!.a.hex).toBe('02');
    expect(nearestWatched(list, ['XYZ'])).toBeNull();
    const heli = ac({ hex: '09', category: 'A7', type: 'B407', distMi: 3 });
    expect(nearestHelicopter([...list, heli])!.hex).toBe('09');
    expect(nearestHelicopter(list)).toBeNull();
  });
});

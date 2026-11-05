// these checks use made-up inputs and known reference values. they prove the arithmetic, not any live service
import { describe, expect, test } from 'bun:test';
import { angleDiff, bearingDeg, compass, destination, distanceMi, offsetMi } from '../data/geo';
import { ago, clock, dateTime, degText, isoLocal, localDayStart, titleCase } from '../data/format';
import { fmtAlt, fmtDist, fmtSpeed } from '../data/units';

const JFK = { lat: 40.6413, lon: -73.7781 };
const LAX = { lat: 33.9416, lon: -118.4085 };
const NOW = 1793821260; // 2026-11-04 19:41 UTC
const EST = -5 * 3600;

describe('geo', () => {
  test('distance between JFK and LAX is about 2,475 statute miles', () => {
    expect(Math.abs(distanceMi(JFK, LAX) - 2475)).toBeLessThan(10);
  });
  test('distance to the same point is zero', () => {
    expect(distanceMi(JFK, JFK)).toBe(0);
  });
  test('bearings in the four directions', () => {
    const o = { lat: 0, lon: 0 };
    expect(bearingDeg(o, { lat: 1, lon: 0 })).toBeCloseTo(0, 5);
    expect(bearingDeg(o, { lat: 0, lon: 1 })).toBeCloseTo(90, 5);
    expect(bearingDeg(o, { lat: -1, lon: 0 })).toBeCloseTo(180, 5);
    expect(bearingDeg(o, { lat: 0, lon: -1 })).toBeCloseTo(270, 5);
  });
  test('compass names', () => {
    expect(compass(0)).toBe('N');
    expect(compass(90)).toBe('E');
    expect(compass(112)).toBe('ESE');
    expect(compass(225)).toBe('SW');
    expect(compass(359)).toBe('N');
    expect(compass(-90)).toBe('W');
  });
  test('angle difference takes the short way round', () => {
    expect(angleDiff(10, 350)).toBe(20);
    expect(angleDiff(350, 10)).toBe(-20);
    expect(angleDiff(90, 90)).toBe(0);
    expect(Math.abs(angleDiff(0, 180))).toBe(180);
  });
  test('destination and distance agree', () => {
    const p = destination(JFK, 90, 10);
    expect(distanceMi(JFK, p)).toBeCloseTo(10, 2);
    expect(bearingDeg(JFK, p)).toBeCloseTo(90, 0);
  });
  test('offset puts east on x and north on y', () => {
    const o = offsetMi({ lat: 0, lon: 0 }, { lat: 0, lon: 1 });
    expect(o.x).toBeCloseTo(69.09, 1);
    expect(Math.abs(o.y)).toBeLessThan(0.01);
    const n = offsetMi({ lat: 0, lon: 0 }, { lat: 1, lon: 0 });
    expect(n.y).toBeCloseTo(69.09, 1);
  });
});

describe('units', () => {
  test('distances', () => {
    expect(fmtDist(2.34, 'imperial')).toBe('2.3 mi');
    expect(fmtDist(12.4, 'imperial')).toBe('12 mi');
    expect(fmtDist(10, 'metric')).toBe('16 km');
    expect(fmtDist(10, 'aviation')).toBe('8.7 nm');
  });
  test('altitudes', () => {
    expect(fmtAlt(3400, 'imperial')).toBe('3,400 ft');
    expect(fmtAlt(null, 'imperial')).toBe('--');
    expect(fmtAlt(0, 'imperial')).toBe('ground');
    expect(fmtAlt(3400, 'metric')).toBe('1,036 m');
  });
  test('speeds are knots except in metric', () => {
    expect(fmtSpeed(212, 'imperial')).toBe('212 kt');
    expect(fmtSpeed(212, 'aviation')).toBe('212 kt');
    expect(fmtSpeed(212, 'metric')).toBe('393 km/h');
    expect(fmtSpeed(null, 'metric')).toBe('--');
  });
});

describe('format', () => {
  test('clock text in a zone', () => {
    expect(clock(NOW, EST, false)).toBe('2:41 PM');
    expect(clock(NOW, EST, true)).toBe('14:41');
    expect(clock(NOW - 14 * 3600 - 41 * 60, EST, false)).toBe('12:00 AM');
    expect(dateTime(NOW, EST, false)).toBe('Nov 4, 2:41 PM');
  });
  test('iso text and start of the local day', () => {
    expect(isoLocal(NOW, EST)).toBe('2026-11-04 14:41');
    expect(localDayStart(NOW, EST)).toBe(Date.UTC(2026, 10, 4, 5) / 1000);
  });
  test('ages and names', () => {
    expect(ago(100, 40)).toBe('60 s ago');
    expect(ago(1000, 0)).toBe('17 min ago');
    expect(ago(20000, 0)).toBe('6 h ago');
    expect(degText(5)).toBe('005°');
    expect(titleCase('DELTA AIR LINES')).toBe('Delta Air Lines');
    expect(titleCase('BOEING 737-800')).toBe('Boeing 737-800');
  });
});

import type { Coord } from './types';

const R_MI = 3958.7613;
const RAD = Math.PI / 180;

export const KM_PER_MI = 1.609344;
export const NM_PER_MI = 0.868976;
export const MPH_PER_KT = 1.150779;

export function distanceMi(a: Coord, b: Coord): number {
  const dLat = (b.lat - a.lat) * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * R_MI * Math.asin(Math.min(1, Math.sqrt(s)));
}

// initial bearing from a to b, 0 to 360
export function bearingDeg(a: Coord, b: Coord): number {
  const p1 = a.lat * RAD;
  const p2 = b.lat * RAD;
  const dl = (b.lon - a.lon) * RAD;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export function compass(deg: number): string {
  return POINTS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16]!;
}

// smallest signed difference between two headings, -180 to 180
export function angleDiff(a: number, b: number): number {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

// x east, y north, in miles, from the observer. flat earth is fine at radar ranges
export function offsetMi(from: Coord, to: Coord): { x: number; y: number } {
  const y = (to.lat - from.lat) * RAD * R_MI;
  const x = (to.lon - from.lon) * RAD * R_MI * Math.cos(((from.lat + to.lat) / 2) * RAD);
  return { x, y };
}

// the point reached by travelling distMi along a bearing
export function destination(from: Coord, bearing: number, distMi: number): Coord {
  const d = distMi / R_MI;
  const b = bearing * RAD;
  const p1 = from.lat * RAD;
  const l1 = from.lon * RAD;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
  const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return { lat: p2 / RAD, lon: ((l2 / RAD + 540) % 360) - 180 };
}

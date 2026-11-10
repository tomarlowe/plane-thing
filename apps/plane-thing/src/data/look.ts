import { compass } from './geo';

// the phone only reports a usable heading while the car is moving
const MIN_MOVING_MPS = 2;

export interface LookCue {
  // degrees clockwise from straight ahead, 0 to 360. null when the car heading is not known
  relativeDeg: number | null;
  // where the aircraft is by compass, always known
  bearingDeg: number;
  compassText: string;
  // the car's own heading as a compass point, null when not known
  carText: string | null;
  // "10 o'clock", null when the car heading is not known
  clockText: string | null;
  // how high above the horizon, rounded to 5 degrees. null when the altitude is not known
  upDeg: number | null;
  height: 'Low' | 'Mid' | 'High' | null;
}

// the heading to trust, or null: needs a phone fix that is moving, never a typed in place
export function usableHeading(headingDeg: number | null, speedMps: number | null): number | null {
  if (headingDeg === null || !Number.isFinite(headingDeg)) return null;
  if (speedMps === null || speedMps < MIN_MOVING_MPS) return null;
  return ((headingDeg % 360) + 360) % 360;
}

export function clockPosition(relativeDeg: number): number {
  const h = Math.round((((relativeDeg % 360) + 360) % 360) / 30) % 12;
  return h === 0 ? 12 : h;
}

// angle above the horizon for a point at this height and ground distance. altitude is above sea level, so this is a
// rough guide, which is why the screen says "about"
export function elevationDeg(altFt: number, distMi: number): number {
  const heightMi = altFt / 5280;
  return (Math.atan2(heightMi, Math.max(distMi, 0.05)) * 180) / Math.PI;
}

export function lookCue(bearingDeg: number, distMi: number, altFt: number | null, carHeadingDeg: number | null): LookCue {
  const rel = carHeadingDeg === null ? null : (((bearingDeg - carHeadingDeg) % 360) + 360) % 360;
  let upDeg: number | null = null;
  let height: LookCue['height'] = null;
  if (altFt !== null) {
    const e = elevationDeg(Math.max(0, altFt), distMi);
    upDeg = Math.min(90, Math.max(0, Math.round(e / 5) * 5));
    height = e < 30 ? 'Low' : e < 60 ? 'Mid' : 'High';
  }
  return {
    relativeDeg: rel,
    bearingDeg,
    compassText: compass(bearingDeg),
    carText: carHeadingDeg === null ? null : compass(carHeadingDeg),
    clockText: rel === null ? null : `${clockPosition(rel)} o'clock`,
    upDeg,
    height,
  };
}

// "Low · About 15° up"
export function upText(c: LookCue): string {
  if (c.height === null || c.upDeg === null) return 'Height Unknown';
  if (c.upDeg >= 85) return `${c.height} · Straight Up`;
  return `${c.height} · About ${c.upDeg}° up`;
}

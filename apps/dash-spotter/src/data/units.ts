import { KM_PER_MI, NM_PER_MI } from './geo';
import type { UnitSystem } from './types';

export function distLabel(u: UnitSystem): string {
  return u === 'metric' ? 'km' : u === 'aviation' ? 'nm' : 'mi';
}

export function distValue(mi: number, u: UnitSystem): number {
  return u === 'metric' ? mi * KM_PER_MI : u === 'aviation' ? mi * NM_PER_MI : mi;
}

// distance with one decimal under ten, whole above
export function fmtDist(mi: number, u: UnitSystem): string {
  const v = distValue(mi, u);
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${distLabel(u)}`;
}

export function fmtAlt(ft: number | null, u: UnitSystem): string {
  if (ft === null) return '--';
  if (ft <= 0) return 'ground';
  if (u === 'metric') return `${Math.round(ft * 0.3048).toLocaleString('en-US')} m`;
  return `${Math.round(ft).toLocaleString('en-US')} ft`;
}

// speed is in knots unless the units are metric, which is how aircraft speeds are quoted everywhere
export function speedLabel(u: UnitSystem): string {
  return u === 'metric' ? 'km/h' : 'kt';
}

export function speedValue(kt: number, u: UnitSystem): number {
  return u === 'metric' ? kt * 1.852 : kt;
}

export function fmtSpeed(kt: number | null, u: UnitSystem): string {
  return kt === null ? '--' : `${Math.round(speedValue(kt, u))} ${speedLabel(u)}`;
}

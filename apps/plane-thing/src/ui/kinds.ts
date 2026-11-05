import { isHelicopter } from '../data/adsb';
import type { RepoState } from '../data/repo';
import type { Aircraft } from '../data/types';
import { matchesWatch } from '../data/watch';
import { BLUE, PEACH, SALMON, YELLOW, type Pal } from './theme';

export type Kind = 'aircraft' | 'helicopter' | 'watched' | 'emergency';

export const KIND_PAL: Record<Kind, Pal> = { aircraft: BLUE, helicopter: PEACH, watched: YELLOW, emergency: SALMON };

// emergencies win, then the user's own list, then helicopters
export function kindOf(a: Aircraft, s: RepoState): Kind {
  if (s.emergencies.some(e => e.hex === a.hex)) return 'emergency';
  if (matchesWatch(a, s.settings.watch)) return 'watched';
  if (isHelicopter(a)) return 'helicopter';
  return 'aircraft';
}

// "Delta Air Lines" becomes "Delta" for tight rows
export function shortOperator(op: string | null): string | null {
  if (!op) return null;
  const t = op.replace(/\b(Air ?Lines?|Airways|Airlines)\b/gi, '').replace(/\s+/g, ' ').trim();
  return t || op;
}

// "3 min" style countdown for the arrivals board
export function minutesText(seconds: number): string {
  const m = Math.max(0, Math.round(seconds / 60));
  if (m < 1) return 'Now';
  if (m < 100) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

// a distance number for ring labels, without trailing zeros
export function ringNum(v: number): string {
  return v < 10 ? String(Math.round(v * 10) / 10) : String(Math.round(v));
}

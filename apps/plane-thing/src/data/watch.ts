import { isHelicopter } from './adsb';
import type { Aircraft } from './types';

// "DAL, N123AB; A388 ae01ce" becomes tokens. anything between letters and numbers is a separator
export function parseWatch(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.toUpperCase().split(/[\s,;]+/)) {
    const t = raw.trim();
    if (t.length >= 2 && !out.includes(t)) out.push(t);
  }
  return out.slice(0, 24);
}

// a token matches a tail number, a hex code, a type code, or the start of a callsign
export function matchesWatch(a: Aircraft, tokens: string[]): string | null {
  const reg = a.reg?.toUpperCase();
  const call = a.callsign?.toUpperCase();
  const type = a.type?.toUpperCase();
  for (const t of tokens) {
    if (t === 'MIL' && a.military) return t;
    if (reg && (reg === t || reg.replace(/-/g, '') === t.replace(/-/g, ''))) return t;
    if (a.hex.toUpperCase() === t) return t;
    if (type && type === t) return t;
    if (call && t.length >= 3 && call.startsWith(t)) return t;
  }
  return null;
}

export function nearestWatched(list: Aircraft[], tokens: string[]): { a: Aircraft; token: string } | null {
  let best: { a: Aircraft; token: string } | null = null;
  for (const a of list) {
    const token = matchesWatch(a, tokens);
    if (token && (!best || a.distMi < best.a.distMi)) best = { a, token };
  }
  return best;
}

export function nearestHelicopter(list: Aircraft[]): Aircraft | null {
  let best: Aircraft | null = null;
  for (const a of list) if (isHelicopter(a) && (!best || a.distMi < best.distMi)) best = a;
  return best;
}

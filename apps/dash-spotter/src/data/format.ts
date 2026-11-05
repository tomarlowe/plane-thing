import { compass } from './geo';

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// local clock text from unix seconds and the zone offset in seconds
export function clock(unixS: number, offsetS: number, h24: boolean): string {
  const d = new Date((unixS + offsetS) * 1000);
  const h = d.getUTCHours();
  const m = pad2(d.getUTCMinutes());
  if (h24) return `${pad2(h)}:${m}`;
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

export function dateTime(unixS: number, offsetS: number, h24: boolean): string {
  const d = new Date((unixS + offsetS) * 1000);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${clock(unixS, offsetS, h24)}`;
}

// iso text in the local zone, for files
export function isoLocal(unixS: number, offsetS: number): string {
  const d = new Date((unixS + offsetS) * 1000);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

export function localDayStart(unixS: number, offsetS: number): number {
  return Math.floor((unixS + offsetS) / 86400) * 86400 - offsetS;
}

// "55 mi NNW" style
export function dirText(deg: number): string {
  return compass(deg);
}

export function degText(deg: number): string {
  return `${String(Math.round(deg) % 360).padStart(3, '0')}°`;
}

// "3 min ago" style age
export function ago(nowS: number, thenS: number): string {
  const s = Math.max(0, nowS - thenS);
  if (s < 90) return `${Math.round(s)} s ago`;
  if (s < 5400) return `${Math.round(s / 60)} min ago`;
  if (s < 172800) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

// ICAO and trade names arrive in capitals, make them readable
export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/(\s+)/)
    .map(w => (/\d/.test(w) || w.length <= 1 ? w.toUpperCase() : w[0]!.toUpperCase() + w.slice(1)))
    .join('')
    .replace(/\b(Llc|Inc|Ltd|Plc|Lp)\b\.?/g, m => m.toUpperCase());
}

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

// words that stay lowercase inside a label. the first word, and the first word after a separator, is always capitalized
const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'out', 'the', 'to', 'up']);
// units and abbreviations that keep their own case
const UNIT_WORDS = new Set(['ft', 'kt', 'mi', 'nm', 'km', 'm', 'h', 's', 'min', 'minute', 'minutes', 'hour', 'hours', 'est.']);

// capitalizes a label for the screen: "closest first · within 15 mi" becomes "Closest First · Within 15 mi"
export function titleLabel(text: string): string {
  let start = true;
  return text
    .split(/(\s+)/)
    .map(w => {
      if (/^\s*$/.test(w)) return w;
      const first = start;
      start = /[:,.·]$/.test(w) || w === '·';
      if (w === '·') return w;
      const bare = w.replace(/[^A-Za-z.]/g, '').toLowerCase();
      if (/\d/.test(w) || (w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w)) || UNIT_WORDS.has(bare)) return w;
      if (!first && SMALL_WORDS.has(bare)) return w.toLowerCase();
      return w[0]!.toUpperCase() + w.slice(1);
    })
    .join('');
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

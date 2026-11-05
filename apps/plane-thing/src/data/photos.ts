import type { Aircraft } from './types';

// where a picture came from, shown as visible text next to it
export interface PhotoCredit {
  photographer: string;
  source: string;
  // the page the thumbnail links to
  link: string;
}

export interface PhotoHit {
  imageUrl: string;
  credit: PhotoCredit;
}

export type PhotoKind = 'exact' | 'fleet' | 'type' | 'none';

export interface PhotoResult {
  kind: PhotoKind;
  hit: PhotoHit | null;
  // set when the picture is another aircraft: "N823DN"
  shows: string | null;
}

const isUrl = (s: unknown): s is string => typeof s === 'string' && /^https:\/\//.test(s);
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

export const planespottersUrl = (kind: 'hex' | 'reg', id: string) =>
  `https://api.planespotters.net/pub/photos/${kind}/${encodeURIComponent(id)}`;

// the reply holds a photos array, empty when there is none. the large thumbnail is 280 px tall
export function parsePlanespotters(json: unknown): PhotoHit | null {
  const photos = (json as { photos?: unknown })?.photos;
  if (!Array.isArray(photos) || !photos.length) return null;
  const p = photos[0] as Record<string, unknown>;
  const large = (p.thumbnail_large as { src?: unknown } | undefined)?.src;
  const small = (p.thumbnail as { src?: unknown } | undefined)?.src;
  const imageUrl = isUrl(large) ? large : isUrl(small) ? small : null;
  const link = p.link;
  if (!imageUrl || !isUrl(link)) return null;
  return { imageUrl, credit: { photographer: str(p.photographer) ?? 'Unknown photographer', source: 'Planespotters.net', link } };
}

export const airportDataUrl = (hex: string) =>
  `https://airport-data.com/api/ac_thumb.json?m=${encodeURIComponent(hex)}&n=1`;

// airport-data.com answers with a status, a count and a data array
export function parseAirportData(json: unknown): PhotoHit | null {
  const data = (json as { data?: unknown })?.data;
  if (!Array.isArray(data) || !data.length) return null;
  const p = data[0] as Record<string, unknown>;
  const imageUrl = p.image;
  const link = p.link;
  if (!isUrl(imageUrl) || !isUrl(link)) return null;
  return { imageUrl, credit: { photographer: str(p.photographer) ?? 'Unknown photographer', source: 'airport-data.com', link } };
}

export function commonsUrl(typeName: string): string {
  const q = encodeURIComponent(`${typeName} in flight`);
  return (
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&generator=search' +
    `&gsrnamespace=6&gsrlimit=6&gsrsearch=${q}&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=420&iiextmetadatafilter=Artist|LicenseShortName`
  );
}

const stripTags = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

// a type photo from wikimedia commons, with the artist and licence it needs for credit
export function parseCommons(json: unknown): PhotoHit | null {
  const pages = (json as { query?: { pages?: unknown } })?.query?.pages;
  if (!Array.isArray(pages)) return null;
  for (const raw of pages) {
    const info = ((raw as { imageinfo?: unknown[] }).imageinfo ?? [])[0] as Record<string, unknown> | undefined;
    if (!info) continue;
    const mime = str(info.mime);
    const thumb = info.thumburl;
    const page = info.descriptionurl;
    if (!isUrl(thumb) || !isUrl(page) || !mime || !/^image\/(jpeg|png)$/.test(mime)) continue;
    const meta = (info.extmetadata ?? {}) as Record<string, { value?: unknown } | undefined>;
    const artist = str(meta.Artist?.value);
    const licence = str(meta.LicenseShortName?.value);
    const who = artist ? stripTags(artist) : 'Unknown photographer';
    return {
      imageUrl: thumb,
      credit: { photographer: licence ? `${who} (${stripTags(licence)})` : who, source: 'Wikimedia Commons', link: page },
    };
  }
  return null;
}

// other aircraft of the same airline and type that are in range right now, nearest first, never the one itself
export function sisterShips(a: Aircraft, others: Aircraft[], key: (x: Aircraft) => string | null, max = 3): Aircraft[] {
  const k = key(a);
  if (!k) return [];
  return others
    .filter(o => o.hex !== a.hex && key(o) === k)
    .sort((x, y) => x.distMi - y.distMi)
    .slice(0, max);
}

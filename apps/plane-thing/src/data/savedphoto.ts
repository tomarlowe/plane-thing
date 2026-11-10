import type { PhotoCredit, PhotoKind } from './photos';

// a picture kept for an aircraft the user marked as seen by eye. one doc per aircraft, the picture as base64 text
export const PHOTO_PREFIX = 'photo.';
export const photoKey = (hex: string) => `${PHOTO_PREFIX}${hex}`;
// the most pictures kept. the oldest go first
export const MAX_SAVED_PHOTOS = 60;
// a doc may hold 256 KiB of text
export const MAX_DOC_CHARS = 250000;

export interface SavedPhoto {
  kind: PhotoKind;
  // set when the picture is another aircraft: "N823DN"
  shows: string | null;
  mime: string;
  credit: PhotoCredit;
  bytes: Uint8Array;
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) bin += String.fromCharCode(...bytes.subarray(i, i + step));
  return btoa(bin);
}

function fromBase64(text: string): Uint8Array {
  const bin = atob(text);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// null when the picture would not fit in one doc
export function encodePhoto(p: SavedPhoto): string | null {
  const text = JSON.stringify({
    v: 1,
    k: p.kind,
    w: p.shows,
    m: p.mime,
    c: p.credit,
    d: toBase64(p.bytes),
  });
  return text.length <= MAX_DOC_CHARS ? text : null;
}

const str = (v: unknown): v is string => typeof v === 'string';

export function decodePhoto(text: string): SavedPhoto | null {
  try {
    const j = JSON.parse(text) as Record<string, unknown>;
    const c = j.c as Record<string, unknown> | undefined;
    if (j.v !== 1 || !str(j.d) || !str(j.m) || !c || !str(c.photographer) || !str(c.source) || !str(c.link)) return null;
    const kind = j.k === 'exact' || j.k === 'fleet' || j.k === 'type' ? j.k : null;
    if (!kind || !/^image\/(jpeg|png)$/.test(j.m)) return null;
    return {
      kind,
      shows: str(j.w) ? j.w : null,
      mime: j.m,
      credit: { photographer: c.photographer, source: c.source, link: c.link },
      bytes: fromBase64(j.d),
    };
  } catch {
    return null;
  }
}

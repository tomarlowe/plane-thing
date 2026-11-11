// SIMULATED bytes written for the tests, not real pictures
import { describe, expect, test } from 'bun:test';
import { decodePhoto, encodePhoto, MAX_DOC_CHARS, MAX_SAVED_PHOTOS, photoKey, PHOTO_PREFIX, type SavedPhoto } from '../data/savedphoto';

const credit = { photographer: 'Sample Photographer', source: 'Planespotters.net', link: 'https://www.planespotters.net/photo/1' };

const sample = (bytes: Uint8Array, o: Partial<SavedPhoto> = {}): SavedPhoto => ({
  kind: 'exact',
  shows: null,
  mime: 'image/jpeg',
  credit,
  bytes,
  ...o,
});

const every256 = () => Uint8Array.from({ length: 256 }, (_, i) => i);

describe('keeping a picture for an aircraft', () => {
  test('the doc key is the prefix and the hex code', () => {
    expect(PHOTO_PREFIX).toBe('photo.');
    expect(photoKey('a1c001')).toBe('photo.a1c001');
    expect(MAX_SAVED_PHOTOS).toBe(60);
  });

  test('every byte value survives a round trip', () => {
    const text = encodePhoto(sample(every256()));
    expect(text).not.toBeNull();
    const back = decodePhoto(text!)!;
    expect(back.kind).toBe('exact');
    expect(back.mime).toBe('image/jpeg');
    expect(back.credit).toEqual(credit);
    expect(back.shows).toBeNull();
    expect([...back.bytes]).toEqual([...every256()]);
  });

  test('a picture of another aircraft keeps whose it is', () => {
    const back = decodePhoto(encodePhoto(sample(new Uint8Array([1, 2, 3]), { kind: 'fleet', shows: 'N823DN' }))!)!;
    expect(back.kind).toBe('fleet');
    expect(back.shows).toBe('N823DN');
  });

  test('a picture larger than a chunk of the encoder still comes back whole', () => {
    const big = Uint8Array.from({ length: 70000 }, (_, i) => (i * 7) % 251);
    const back = decodePhoto(encodePhoto(sample(big, { mime: 'image/png' }))!)!;
    expect(back.mime).toBe('image/png');
    expect(back.bytes.length).toBe(70000);
    expect(back.bytes[69999]).toBe((69999 * 7) % 251);
  });

  test('a picture too big for one doc is refused instead of cut', () => {
    // base64 grows the size by a third, so this is well past the limit
    const huge = new Uint8Array(Math.ceil((MAX_DOC_CHARS * 3) / 4) + 1000);
    expect(encodePhoto(sample(huge))).toBeNull();
    // and one just under the limit fits
    const fits = new Uint8Array(Math.floor((MAX_DOC_CHARS * 3) / 4) - 1000);
    const text = encodePhoto(sample(fits));
    expect(text).not.toBeNull();
    expect(text!.length).toBeLessThanOrEqual(MAX_DOC_CHARS);
  });

  test('damaged or foreign docs read as nothing', () => {
    const good = JSON.parse(encodePhoto(sample(new Uint8Array([9])))!) as Record<string, unknown>;
    const as = (o: Record<string, unknown>) => decodePhoto(JSON.stringify({ ...good, ...o }));
    expect(decodePhoto('not json')).toBeNull();
    expect(decodePhoto('')).toBeNull();
    expect(decodePhoto('null')).toBeNull();
    expect(decodePhoto('[]')).toBeNull();
    expect(as({ v: 2 })).toBeNull();
    expect(as({ k: 'sky' })).toBeNull();
    expect(as({ k: 'none' })).toBeNull();
    expect(as({ m: 'text/html' })).toBeNull();
    expect(as({ d: 5 })).toBeNull();
    expect(as({ d: '***not base64***' })).toBeNull();
    expect(as({ c: null })).toBeNull();
    expect(as({ c: { photographer: 'x', source: 'y' } })).toBeNull();
    // and the untouched doc still reads
    expect(as({})).not.toBeNull();
  });
});

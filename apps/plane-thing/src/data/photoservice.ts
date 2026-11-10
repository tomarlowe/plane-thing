import { fleetKey } from './adsb';
import {
  airportDataUrl,
  commonsUrl,
  parseAirportData,
  parseCommons,
  parsePlanespotters,
  planespottersUrl,
  sisterShips,
  type PhotoHit,
  type PhotoResult,
} from './photos';
import type { Aircraft } from './types';
import { NoAnswerError, type Platform } from '../platform/types';

const JSON_TTL_S = 3600;
const RESULT_TTL_S = 1800;
const KEEP_IMAGES = 8;

export const NO_PHOTO: PhotoResult = { kind: 'none', hit: null, shows: null };

// finds a picture for an aircraft, trying the exact one first and then stand-ins. the latest few pictures are held as blob
// addresses for the screen, with their bytes beside them for when one is saved. the services ask for credit next to each picture
export class PhotoService {
  private json = new Map<string, { at: number; hit: PhotoHit | null }>();
  private results = new Map<string, { at: number; r: PhotoResult }>();
  private pending = new Map<string, Promise<PhotoResult>>();
  private images = new Map<string, string>();
  // the bytes behind each blob address
  private raw = new Map<string, { bytes: Uint8Array; mime: string }>();
  private chain: Promise<unknown> = Promise.resolve();

  constructor(private p: Platform) {}

  // runs network work one job at a time
  private queue<T>(job: () => Promise<T>): Promise<T> {
    const run = this.chain.then(job, job);
    this.chain = run.catch(() => undefined);
    return run;
  }

  private async lookup(key: string, url: string, parse: (j: unknown) => PhotoHit | null): Promise<PhotoHit | null> {
    const now = this.p.nowS();
    const have = this.json.get(key);
    if (have && now - have.at < JSON_TTL_S) return have.hit;
    const r = await this.p.fetchBytes(url, { timeoutMs: 15000 });
    if (!r.ok) throw new NoAnswerError(r.error);
    if (r.status < 200 || r.status >= 300) return null;
    let hit: PhotoHit | null = null;
    try {
      hit = parse(JSON.parse(new TextDecoder().decode(r.body)));
    } catch {
      hit = null;
    }
    this.json.set(key, { at: now, hit });
    return hit;
  }

  // downloads the picture and returns an address the screen can show
  private async picture(hit: PhotoHit): Promise<PhotoHit | null> {
    const have = this.images.get(hit.imageUrl);
    if (have) {
      this.images.delete(hit.imageUrl);
      this.images.set(hit.imageUrl, have);
      return { ...hit, imageUrl: have };
    }
    const r = await this.p.fetchBytes(hit.imageUrl, { timeoutMs: 25000 });
    if (!r.ok) throw new NoAnswerError(r.error);
    if (r.status !== 200 || !r.body.length) return null;
    const mime = /\.png(\?|$)/i.test(hit.imageUrl) ? 'image/png' : 'image/jpeg';
    const url = URL.createObjectURL(new Blob([r.body as BlobPart], { type: mime }));
    this.images.set(hit.imageUrl, url);
    this.raw.set(url, { bytes: r.body, mime });
    while (this.images.size > KEEP_IMAGES) {
      const oldest = this.images.keys().next().value as string;
      const old = this.images.get(oldest)!;
      URL.revokeObjectURL(old);
      this.raw.delete(old);
      this.images.delete(oldest);
    }
    return { ...hit, imageUrl: url };
  }

  // the picture behind a blob address handed out by this service, while it is still held
  rawFor(blobUrl: string): { bytes: Uint8Array; mime: string } | null {
    return this.raw.get(blobUrl) ?? null;
  }

  private async exact(a: { hex: string; reg: string | null }): Promise<PhotoHit | null> {
    const byHex = await this.lookup(`ps:hex:${a.hex}`, planespottersUrl('hex', a.hex), parsePlanespotters);
    if (byHex) return byHex;
    if (a.reg) {
      const byReg = await this.lookup(`ps:reg:${a.reg}`, planespottersUrl('reg', a.reg), parsePlanespotters);
      if (byReg) return byReg;
    }
    return this.lookup(`ad:${a.hex}`, airportDataUrl(a.hex), parseAirportData);
  }

  find(a: Aircraft, others: Aircraft[]): Promise<PhotoResult> {
    const now = this.p.nowS();
    const done = this.results.get(a.hex);
    if (done && now - done.at < RESULT_TTL_S) return Promise.resolve(done.r);
    const going = this.pending.get(a.hex);
    if (going) return going;
    const job = this.queue(() => this.chainFor(a, others)).then(({ r, linkDown }) => {
      // an answer of none is not remembered when the phone link was down, so it is tried again later
      if (r.kind !== 'none' || !linkDown) this.results.set(a.hex, { at: this.p.nowS(), r });
      return r;
    });
    this.pending.set(a.hex, job);
    void job.finally(() => this.pending.delete(a.hex)).catch(() => undefined);
    return job;
  }

  private async chainFor(a: Aircraft, others: Aircraft[]): Promise<{ r: PhotoResult; linkDown: boolean }> {
    try {
      const own = await this.exact(a);
      const shown = own ? await this.picture(own) : null;
      if (shown) return { r: { kind: 'exact', hit: shown, shows: null }, linkDown: false };
      for (const s of sisterShips(a, others, fleetKey)) {
        const hit = await this.exact(s);
        const pic = hit ? await this.picture(hit) : null;
        if (pic) return { r: { kind: 'fleet', hit: pic, shows: s.reg ?? s.hex.toUpperCase() }, linkDown: false };
      }
      if (a.desc) {
        const hit = await this.lookup(`wc:${a.desc}`, commonsUrl(a.desc), parseCommons);
        const pic = hit ? await this.picture(hit) : null;
        if (pic) return { r: { kind: 'type', hit: pic, shows: null }, linkDown: false };
      }
    } catch (e) {
      // a failed lookup is not an error worth showing, the screen falls back to the silhouette
      return { r: NO_PHOTO, linkDown: e instanceof NoAnswerError };
    }
    return { r: NO_PHOTO, linkDown: false };
  }
}

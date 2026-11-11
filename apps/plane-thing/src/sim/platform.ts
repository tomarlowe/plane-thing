// SIMULATED platform for the offline simulator, the screenshots and the tests. every reply comes from fixtures.ts, so
// nothing here is a real aircraft, photo or delay.
//
// address options (all optional). any other option is read as an app setting, such as units=metric or watch_list=UAL2210
//   scenario=normal|empty|emergency|fleet   what is in the sky. emergency adds a 7700 squawk after emergency_after seconds
//   emergency_after=20                      seconds before the emergency starts
//   photo=all|sister|type|none              which pictures exist
//   fail=flights,squawk,photos,faa,routes,position,airports,all   makes those feeds fail
//   frozen=1                                keeps the clock at 2:41 PM instead of running
//   speed=10                                runs the clock faster
//   slow=ms                                 adds a delay to every reply
//   heading=90                              the phone reports this driving direction in degrees, at 15 m/s. without it the phone gives none

import type { FetchOptions, FetchResult, Platform, PositionResult } from '../platform/types';
import {
  airportDataReply,
  commonsReply,
  faaXml,
  planespottersReply,
  place,
  pointReply,
  routeReply,
  SIM_COORD,
  SIM_NOW_S,
  SIM_OFFSET_S,
  SISTER_HEX,
  squawkReply,
  visible,
  type Scenario,
} from './fixtures';
import { distanceMi } from '../data/geo';

const enc = new TextEncoder();
const json = (v: unknown): FetchResult => ({ ok: true, status: 200, body: enc.encode(JSON.stringify(v)) });
const text = (v: string): FetchResult => ({ ok: true, status: 200, body: enc.encode(v) });
const fail = (error: string): FetchResult => ({ ok: false, error });

// a drawn picture of an airliner on a sky, standing in for a photo
async function drawPhoto(w: number, h: number, hue: number): Promise<Uint8Array> {
  if (typeof document === 'undefined') return new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, `hsl(${hue} 70% 55%)`);
  sky.addColorStop(1, `hsl(${hue} 80% 88%)`);
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#F4F7FF';
  g.beginPath();
  g.ellipse(w * 0.5, h * 0.55, w * 0.42, h * 0.07, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#D2DDF4';
  g.beginPath();
  g.moveTo(w * 0.52, h * 0.56);
  g.lineTo(w * 0.36, h * 0.72);
  g.lineTo(w * 0.47, h * 0.72);
  g.lineTo(w * 0.7, h * 0.56);
  g.fill();
  g.beginPath();
  g.moveTo(w * 0.14, h * 0.5);
  g.lineTo(w * 0.1, h * 0.3);
  g.lineTo(w * 0.2, h * 0.3);
  g.lineTo(w * 0.28, h * 0.5);
  g.fill();
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.font = `bold ${Math.round(h * 0.06)}px sans-serif`;
  g.fillText('SIMULATED PICTURE', w * 0.05, h * 0.95);
  const blob = await new Promise<Blob | null>(res => c.toBlob(res, 'image/png'));
  return blob ? new Uint8Array(await blob.arrayBuffer()) : new Uint8Array();
}

export interface SimOptions {
  // the packed airport file, for runs that cannot fetch it from a page (tests)
  airportData?: Uint8Array;
  // replaces the clock, for tests that step time by hand
  clock?: () => number;
}

export function simPlatform(params: URLSearchParams, opts: SimOptions = {}): Platform {
  const scenario = (params.get('scenario') ?? 'normal') as Scenario;
  const emergencyAfterS = Number(params.get('emergency_after') ?? 20);
  const photo = params.get('photo') ?? (scenario === 'fleet' ? 'sister' : 'all');
  const fails = new Set((params.get('fail') ?? '').split(',').filter(Boolean));
  const all = fails.has('all');
  const speed = Number(params.get('speed') ?? 1) || 1;
  const frozen = params.has('frozen');
  const slow = Number(params.get('slow') ?? 0) || 0;
  const bootMs = Date.now();
  const config: Record<string, string> = {};
  for (const [k, v] of params) config[k] = v;
  const listeners = new Set<(key: string, value: string | null) => void>();
  const docListeners = new Set<(key: string, value: string | null) => void>();
  const stores = { s: new Map<string, string>(), d: new Map<string, string>() };

  const elapsed = () => (frozen ? 0 : ((Date.now() - bootMs) / 1000) * speed);
  const nowS = () => (opts.clock ? opts.clock() : Math.floor(SIM_NOW_S + elapsed()));
  const tSec = () => nowS() - SIM_NOW_S;

  const placed = () => visible(scenario, tSec(), emergencyAfterS).map(a => place(a, tSec()));

  async function reply(url: string, o: FetchOptions): Promise<FetchResult> {
    const u = new URL(url);
    const host = u.host;
    const path = u.pathname;
    const now = nowS();

    // flight data, in the shape each service uses
    if (host === 'api.adsb.lol' || host === 'api.airplanes.live' || host === 'opendata.adsb.fi') {
      if (path.startsWith('/api/0/routeset')) {
        if (all || fails.has('routes')) return fail('Request failed');
        const body = o.body ? (JSON.parse(new TextDecoder().decode(o.body)) as { planes: Array<{ callsign: string }> }) : { planes: [] };
        return json(routeReply(body.planes.map(p => p.callsign)));
      }
      const isSquawk = /\/(squawk|sqk)\//.test(path);
      if (all || fails.has(isSquawk ? 'squawk' : 'flights')) return fail('Request failed');
      const v3 = host === 'opendata.adsb.fi' && path.includes('/v3/');
      const list = placed();
      if (isSquawk) return json(squawkReply(list, path.split('/').pop()!, now, host === 'opendata.adsb.fi'));
      const m = /\/point\/([-\d.]+)\/([-\d.]+)\/(\d+)/.exec(path) ?? /\/lat\/([-\d.]+)\/lon\/([-\d.]+)\/dist\/(\d+)/.exec(path);
      if (!m) return { ok: true, status: 404, body: enc.encode('{}') };
      return json(pointReply(list, { lat: Number(m[1]), lon: Number(m[2]) }, Number(m[3]), now, v3));
    }

    if (host === 'nasstatus.faa.gov') return all || fails.has('faa') ? fail('Request failed') : text(faaXml());

    if (host === 'api.planespotters.net') {
      if (all || fails.has('photos')) return fail('Request failed');
      const id = decodeURIComponent(path.split('/').pop() ?? '');
      const hit = photo === 'all' || (photo === 'sister' && id.toLowerCase() === SISTER_HEX);
      return json(planespottersReply(hit, 'Sample Photographer'));
    }
    if (host === 'airport-data.com') return all || fails.has('photos') ? fail('Request failed') : json(airportDataReply());
    if (host === 'commons.wikimedia.org') {
      if (all || fails.has('photos')) return fail('Request failed');
      return json(commonsReply(photo === 'type'));
    }
    if (host === 't.sim.invalid') return { ok: true, status: 200, body: await drawPhoto(420, 280, path.includes('type') ? 25 : path.includes('large') ? 210 : 190) };

    return { ok: true, status: 404, body: enc.encode('not found') };
  }

  return {
    kind: 'sim',
    nowS,

    async fetchBytes(url, o = {}) {
      if (slow) await new Promise(r => setTimeout(r, slow));
      return reply(url, o);
    },

    async storeGet(key) {
      return stores.s.get(key) ?? null;
    },
    async storePut(key, value) {
      stores.s.set(key, value);
    },
    async docGet(key) {
      return stores.d.get(key) ?? null;
    },
    async docPut(key, value) {
      stores.d.set(key, value);
    },
    async docDelete(key) {
      stores.d.delete(key);
      for (const cb of docListeners) cb(key, null);
    },
    onDoc(cb) {
      docListeners.add(cb);
      return () => docListeners.delete(cb);
    },

    async configAll() {
      return { ...config };
    },
    onConfig(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },

    async getPosition(): Promise<PositionResult> {
      if (all || fails.has('position')) return { ok: false, error: 'Location is turned off for this app on the phone' };
      const lat = Number(params.get('lat'));
      const lon = Number(params.get('lon'));
      const here = params.has('lat') && Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : SIM_COORD;
      const heading = params.has('heading') ? Number(params.get('heading')) : NaN;
      const driving = Number.isFinite(heading);
      return { ok: true, fix: { ...here, speedMps: driving ? 15 : null, headingDeg: driving ? heading : null } };
    },

    async utcOffsetS() {
      return SIM_OFFSET_S;
    },

    async loadAirportData() {
      if (fails.has('airports')) throw new Error('The airport file did not load');
      if (opts.airportData) return opts.airportData;
      const { loadAirportFile } = await import('../platform/shared');
      return loadAirportFile();
    },

    async launcherGesture() {
      return null;
    },
  };
}

// handy for tests: how far a placed aircraft is from the simulated user
export const simDistance = (lat: number, lon: number) => distanceMi(SIM_COORD, { lat, lon });

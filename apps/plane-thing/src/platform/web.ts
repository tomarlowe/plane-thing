import type { Coord } from '../data/types';
import { loadAirportFile, zoneOffsetS } from './shared';
import type { FetchOptions, FetchResult, Platform, PositionResult } from './types';

// a plain browser: real network through fetch, settings from the page address, storage from localStorage.
// used by the simulator page and by anyone running the app without a device
export function webPlatform(opts: { config?: Record<string, string>; coord?: Coord } = {}): Platform {
  const listeners = new Set<(key: string, value: string | null) => void>();
  const config = { ...opts.config };
  const read = (prefix: string, key: string) => {
    try {
      return localStorage.getItem(`ds:${prefix}:${key}`);
    } catch {
      return null;
    }
  };
  const write = (prefix: string, key: string, value: string | null) => {
    try {
      if (value === null) localStorage.removeItem(`ds:${prefix}:${key}`);
      else localStorage.setItem(`ds:${prefix}:${key}`, value);
    } catch {
      // storage can be blocked, the app works without it
    }
  };
  return {
    kind: 'web',
    nowS: () => Math.floor(Date.now() / 1000),

    async fetchBytes(url: string, o: FetchOptions = {}): Promise<FetchResult> {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), o.timeoutMs ?? 20000);
      try {
        // browsers refuse to set a custom user agent, so only the other headers are forwarded
        const { 'User-Agent': _ua, ...headers } = o.headers ?? {};
        const res = await fetch(url, {
          signal: ctl.signal,
          method: o.method ?? 'GET',
          headers,
          body: o.body ? (o.body as BodyInit) : undefined,
        });
        return { ok: true, status: res.status, body: new Uint8Array(await res.arrayBuffer()) };
      } catch {
        return { ok: false, error: ctl.signal.aborted ? 'Timed out' : 'Network unavailable' };
      } finally {
        clearTimeout(timer);
      }
    },

    async storeGet(key) {
      return read('s', key);
    },
    async storePut(key, value) {
      write('s', key, value);
    },
    async docGet(key) {
      return read('d', key);
    },
    async docPut(key, value) {
      write('d', key, value);
    },
    async docDelete(key) {
      write('d', key, null);
    },
    onDoc() {
      return () => undefined;
    },

    async configAll() {
      return { ...config };
    },

    onConfig(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },

    getPosition(): Promise<PositionResult> {
      if (opts.coord) return Promise.resolve({ ok: true, fix: { ...opts.coord, speedMps: null, headingDeg: null } });
      return new Promise(resolve => {
        if (!navigator.geolocation) return resolve({ ok: false, error: 'Location is not available' });
        navigator.geolocation.getCurrentPosition(
          p =>
            resolve({
              ok: true,
              fix: { lat: p.coords.latitude, lon: p.coords.longitude, speedMps: p.coords.speed, headingDeg: p.coords.heading },
            }),
          () => resolve({ ok: false, error: 'Location is turned off' }),
          { timeout: 15000, maximumAge: 5000, enableHighAccuracy: true },
        );
      });
    },

    async utcOffsetS() {
      return zoneOffsetS(null, null);
    },

    loadAirportData: loadAirportFile,

    async launcherGesture() {
      return null;
    },
  };
}

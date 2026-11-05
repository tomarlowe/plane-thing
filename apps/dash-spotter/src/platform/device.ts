import type { BridgethingClient } from '@bridgething/client';
import { loadAirportFile, zoneOffsetS } from './shared';
import type { FetchOptions, FetchResult, Platform, PositionResult } from './types';
import { USER_AGENT } from './types';

function netMessage(e: { type: string; data?: { reason?: string } }): string {
  switch (e.type) {
    case 'noGateway':
      return 'Phone not connected';
    case 'timeout':
      return 'Timed out';
    case 'unavailable':
      return 'Network unavailable';
    default:
      return e.data?.reason ?? 'Request failed';
  }
}

function geoMessage(e: string): string {
  switch (e) {
    case 'permissionDenied':
      return 'Location is turned off for this app on the phone';
    case 'notDeclared':
      return 'Location is not enabled for this app';
    default:
      return 'Phone location is not available';
  }
}

// bytes can arrive as a typed array or as a plain number array depending on the link
function toBytes(b: unknown): Uint8Array {
  return b instanceof Uint8Array ? b : new Uint8Array(b as number[]);
}

export function devicePlatform(client: BridgethingClient): Platform {
  return {
    kind: 'device',
    nowS: () => Math.floor(Date.now() / 1000),

    async fetchBytes(url: string, opts: FetchOptions = {}): Promise<FetchResult> {
      const timeoutMs = opts.timeoutMs ?? 20000;
      const headers = { 'User-Agent': USER_AGENT, ...opts.headers };
      try {
        const r = await client.net.fetch(
          {
            request: {
              url,
              method: opts.method ?? 'GET',
              headers: Object.entries(headers).map(([name, value]) => ({ name, value })),
              body: opts.body ?? null,
              timeoutMs,
              redirect: 'follow',
            },
          },
          { timeoutMs: timeoutMs + 5000 },
        );
        if (r.ok) return { ok: true, status: r.response.response.status, body: toBytes(r.response.response.body) };
        if (r.kind === 'domain') return { ok: false, error: netMessage(r.error.error) };
        return { ok: false, error: 'Device link problem' };
      } catch {
        return { ok: false, error: 'Device link problem' };
      }
    },

    async storeGet(key) {
      const r = await client.store.get({ key });
      return r.ok ? r.response.value : null;
    },

    async storePut(key, value) {
      await client.store.put({ key, value });
    },

    async docGet(key) {
      const r = await client.doc.get({ key });
      return r.ok ? r.response.value : null;
    },

    async docPut(key, value) {
      const r = await client.doc.set({ key, value });
      if (!r.ok) throw new Error('The device did not accept the saved log');
    },

    async docDelete(key) {
      await client.doc.delete({ key });
    },

    onDoc(cb) {
      return client.doc.onChanged(c => cb(c.key, c.value));
    },

    async configAll() {
      const r = await client.config.list();
      const out: Record<string, string> = {};
      if (r.ok) for (const e of r.response.entries) out[e.key] = e.value;
      return out;
    },

    onConfig(cb) {
      return client.config.onChanged(c => cb(c.key, c.value));
    },

    async getPosition(): Promise<PositionResult> {
      try {
        const r = await client.geo.getOnce({ accuracy: 'fine', maxAgeS: 5 }, { timeoutMs: 20000 });
        if (r.ok) {
          const p = r.response.position;
          return { ok: true, fix: { lat: p.lat, lon: p.lon, speedMps: p.speedMps, headingDeg: p.headingDeg } };
        }
        if (r.kind === 'domain') return { ok: false, error: geoMessage(r.error.error) };
        return { ok: false, error: 'Phone location is not available' };
      } catch {
        return { ok: false, error: 'Phone location is not available' };
      }
    },

    async utcOffsetS() {
      try {
        const r = await client.time.get();
        if (r.ok) {
          const t = r.response.time;
          return zoneOffsetS(t.tzIana, t.utcOffsetMinutes);
        }
      } catch {
        // falls through to the browser's own zone
      }
      return zoneOffsetS(null, null);
    },

    loadAirportData: loadAirportFile,

    async launcherGesture() {
      try {
        const r = await client.system.launcherGestureGet();
        return r.ok ? r.response.gesture : null;
      } catch {
        return null;
      }
    },
  };
}

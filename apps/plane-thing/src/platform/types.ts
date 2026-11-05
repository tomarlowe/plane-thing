import type { Coord } from '../data/types';

export type FetchResult = { ok: true; status: number; body: Uint8Array } | { ok: false; error: string };

export interface FetchOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  method?: 'GET' | 'POST';
  body?: Uint8Array;
}

export interface Fix extends Coord {
  // metres per second, degrees clockwise from north. null when the phone did not say
  speedMps: number | null;
  headingDeg: number | null;
}

export type PositionResult = { ok: true; fix: Fix } | { ok: false; error: string };

// everything the app needs from the outside world. the device, a plain browser and the offline
// simulator each provide one, so the rest of the code never knows which it is running on
export interface Platform {
  readonly kind: 'device' | 'web' | 'sim';
  nowS(): number;
  fetchBytes(url: string, opts?: FetchOptions): Promise<FetchResult>;
  storeGet(key: string): Promise<string | null>;
  storePut(key: string, value: string): Promise<void>;
  // docs are shared with the settings page on the phone, which is how the log gets exported
  docGet(key: string): Promise<string | null>;
  docPut(key: string, value: string): Promise<void>;
  docDelete(key: string): Promise<void>;
  // fires when the phone changes or removes a doc. value is null for a removal
  onDoc(cb: (key: string, value: string | null) => void): () => void;
  configAll(): Promise<Record<string, string>>;
  onConfig(cb: (key: string, value: string | null) => void): () => void;
  getPosition(): Promise<PositionResult>;
  // seconds to add to unix time for local time
  utcOffsetS(): Promise<number>;
  // the packed airport file that ships inside the app
  loadAirportData(): Promise<Uint8Array>;
  // how the launcher is reached on this device, so the app can warn when "m" is taken
  launcherGesture(): Promise<string | null>;
}

// sent with every request. services ask for a name and a place to read about the app
export const USER_AGENT = 'PlaneThing/0.1 (+https://github.com/tomarlowe/plane-thing; bridgething app for the Spotify Car Thing)';

// no answer came back at all: phone not connected, phone offline, timed out
export class NoAnswerError extends Error {}

export async function fetchJson(p: Platform, url: string, opts?: FetchOptions): Promise<unknown> {
  const r = await p.fetchBytes(url, { timeoutMs: 20000, ...opts });
  if (!r.ok) throw new NoAnswerError(r.error);
  if (r.status < 200 || r.status >= 300) throw new Error(`server answered ${r.status}`);
  try {
    return JSON.parse(new TextDecoder().decode(r.body));
  } catch {
    throw new Error('server reply was not readable');
  }
}

export async function fetchText(p: Platform, url: string, opts?: FetchOptions): Promise<string> {
  const r = await p.fetchBytes(url, { timeoutMs: 20000, ...opts });
  if (!r.ok) throw new NoAnswerError(r.error);
  if (r.status < 200 || r.status >= 300) throw new Error(`server answered ${r.status}`);
  return new TextDecoder().decode(r.body);
}

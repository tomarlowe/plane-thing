import { fetchJson, fetchText, NoAnswerError, type Fix, type Platform } from '../platform/types';
import { inbound, type Arrival } from './arrivals';
import { isAircraftLike, nearbyUrl, NEARBY_ORDER, parseProvider, relocate, SQUAWK_ORDER, squawkUrl, type ProviderId } from './adsb';
import {
  buildWorkingSet,
  decodeAirports,
  needsRebuild,
  nearestAirports,
  type AirportDb,
  type WorkingSet,
} from './airports';
import { EmergencyTracker, EMERGENCY_CODES, ALERT_RADIUS_MI, isEmergencyCode } from './emergency';
import { FAA_URL, parseFaa, statusFor, type FaaStatus } from './faa';
import { META_KEY, SpotterLog, type LogDocs, type LogStats, type TypeRow } from './log';
import { NO_PHOTO, PhotoService } from './photoservice';
import type { PhotoResult } from './photos';
import { decodePhoto, encodePhoto, MAX_SAVED_PHOTOS, photoKey } from './savedphoto';
import { parseRouteSet, ROUTE_URL, routeBody, wantsRoute, type RouteGuess } from './route';
import type { Aircraft, Coord, EmergencyInfo, Feed, LogEntry, NearAirport, Settings } from './types';
import { DEFAULT_SETTINGS } from './types';
import { parseWatch } from './watch';

// the zone the Overhead screen cares about
export const OVERHEAD_MI = 10;

// the most rows the log screens hold at once. the export always has the whole log
const LOG_LIST_MAX = 200;
// saved pictures kept ready to show on the photos view
const KEEP_SAVED_SHOWN = 6;

// seconds between runs of each job
const EVERY = { position: 8, nearby: 6, squawk: 25, recheck: 8, wide: 60, arrivals: 10, faa: 300, save: 15 } as const;

// a position this old is dropped from the screens
const MAX_AGE_S = 60;

export interface AlertState {
  // changes for each new alert, so the screen can restart its flash
  n: number;
  info: EmergencyInfo;
  atS: number;
}

export interface PhotoState {
  hex: string | null;
  status: 'idle' | 'loading' | 'done';
  result: PhotoResult;
}

// what the Overhead screen is about: the closest aircraft, or one picked on the Radar
export interface Shown {
  a: Aircraft | null;
  picked: boolean;
  // a picked aircraft that is no longer heard
  lost: boolean;
}

export type SeenOutcome = { kind: 'new' | 'again'; tail: string; at: number } | { kind: 'none'; why: 'zone' | 'lost' };

// an emergency aircraft carries no speed or heading, so those stay empty on the screen
export function emergencyAircraft(e: EmergencyInfo): Aircraft {
  return {
    hex: e.hex,
    reg: e.reg,
    callsign: e.callsign,
    type: e.type,
    desc: e.desc,
    operator: null,
    lat: e.lat,
    lon: e.lon,
    altFt: e.altFt,
    onGround: false,
    gsKt: null,
    trackDeg: null,
    vertFpm: null,
    squawk: e.code,
    category: null,
    military: false,
    seenPosS: 0,
    distMi: e.distMi,
    bearingDeg: e.bearingDeg,
  };
}

export function shownOf(s: Pick<RepoState, 'picked' | 'aircraft' | 'emergencies' | 'overhead'>): Shown {
  if (s.picked) {
    const live = (s.aircraft.data ?? []).find(a => a.hex === s.picked && !a.onGround && a.seenPosS <= MAX_AGE_S);
    if (live) return { a: live, picked: true, lost: false };
    const e = s.emergencies.find(x => x.hex === s.picked);
    if (e) return { a: emergencyAircraft(e), picked: true, lost: false };
    return { a: null, picked: true, lost: true };
  }
  return { a: s.overhead, picked: false, lost: false };
}

export interface RepoState {
  settings: Settings;
  nowS: number;
  offsetS: number;
  fix: Fix | null;
  fixSource: 'phone' | 'manual' | 'cached' | 'none';
  fixError: string | null;
  aircraft: Feed<Aircraft[]>;
  // when the aircraft list was fetched
  aircraftAt: number;
  provider: ProviderId | null;
  // radius of the last nearby search, in miles
  radiusMi: number;
  // the closest airborne aircraft in range, with hysteresis so two near-equal ones do not flicker
  overhead: Aircraft | null;
  // set when nothing is in the overhead zone: the nearest one seen by a wider search
  far: { distMi: number; bearingDeg: number } | null;
  airportCount: number;
  airportLabel: string;
  airportsReady: boolean;
  // nearest of any kind, then nearest large or medium
  nearAny: NearAirport[];
  nearBig: NearAirport[];
  airportPick: number;
  arrivalsPick: number;
  emergencies: EmergencyInfo[];
  alert: AlertState | null;
  photo: PhotoState;
  routes: Record<string, RouteGuess | null>;
  arrivals: Feed<Arrival[]>;
  faa: FaaStatus | null;
  // the hex of the aircraft picked on the radar, or null for the closest one
  picked: string | null;
  logStats: LogStats;
  // newest sighting first
  logRecent: LogEntry[];
  // first logged today, newest first
  logToday: LogEntry[];
  logTypes: TypeRow[];
  // marked as visually verified, newest mark first
  logSeen: LogEntry[];
  logVersion: number;
}

const idle = <T>(): Feed<T> => ({ data: null, status: 'idle', error: null });

export function parseSettings(cfg: Record<string, string>): Settings {
  const lat = Number(cfg.manual_lat);
  const lon = Number(cfg.manual_lon);
  const validManual = Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0);
  const units = cfg.units === 'metric' || cfg.units === 'aviation' ? cfg.units : 'imperial';
  const mode = cfg.airports_mode === 'country' || cfg.airports_mode === 'world' ? cfg.airports_mode : 'auto';
  const logMi = Number(cfg.log_distance);
  return {
    units,
    clock24: cfg.clock === '24',
    manual: cfg.location_mode === 'manual' && validManual ? { lat, lon } : null,
    airportsMode: mode,
    airportsCountry: (cfg.airports_country ?? '').trim().toUpperCase(),
    logMi: Number.isFinite(logMi) && logMi >= 1 && logMi <= 50 ? logMi : DEFAULT_SETTINGS.logMi,
    watch: parseWatch(cfg.watch_list ?? ''),
    emergencyJump: cfg.emergency_jump !== 'false',
    dialReverse: cfg.dial_reverse === 'true',
  };
}

// seconds to wait after a failed run
export const retryAfterS = (fails: number, noAnswer: boolean) => (noAnswer ? 30 : Math.min(15 * 2 ** (fails - 1), 300));

interface Job {
  at: number;
  fails: number;
  noAnswer: boolean;
  busy: boolean;
}

const newJob = (): Job => ({ at: 0, fails: 0, noAnswer: false, busy: false });
const LINK_DOWN = /Phone not connected|Device link/;

export class Repo {
  private state: RepoState;
  private subs = new Set<() => void>();
  private jobs = {
    position: newJob(),
    nearby: newJob(),
    squawk: newJob(),
    wide: newJob(),
    arrivals: newJob(),
    faa: newJob(),
  };
  private timer: ReturnType<typeof setInterval> | null = null;
  private offConfig: (() => void) | null = null;
  private offDoc: (() => void) | null = null;
  private rawConfig: Record<string, string> = {};
  private down = new Map<ProviderId, { until: number; fails: number }>();
  private hostAt = new Map<string, number>();
  private db: AirportDb | null = null;
  private set_: WorkingSet = { list: [], around: null, label: '' };
  private tracker = new EmergencyTracker();
  private log = new SpotterLog();
  private photos: PhotoService;
  private screen = 'overhead';
  private rangeMi = 15;
  private alertN = 0;
  private overheadHex: string | null = null;
  private photoWanted: { hex: string; sinceMs: number } | null = null;
  // marked as visually verified before the picture had loaded. saved as soon as it does
  private keepWhenReady = new Set<string>();
  private saved = new Map<string, PhotoResult | null>();
  private saveAt = 0;
  private startedS = 0;
  private routeAsked = new Set<string>();
  private ticking = false;

  constructor(private p: Platform) {
    this.photos = new PhotoService(p);
    this.state = {
      settings: DEFAULT_SETTINGS,
      nowS: p.nowS(),
      offsetS: 0,
      fix: null,
      fixSource: 'none',
      fixError: null,
      aircraft: idle(),
      aircraftAt: 0,
      provider: null,
      radiusMi: 0,
      overhead: null,
      far: null,
      airportCount: 0,
      airportLabel: '',
      airportsReady: false,
      nearAny: [],
      nearBig: [],
      airportPick: 0,
      arrivalsPick: 0,
      emergencies: [],
      alert: null,
      photo: { hex: null, status: 'idle', result: NO_PHOTO },
      routes: {},
      arrivals: idle(),
      faa: null,
      picked: null,
      logStats: { total: 0, types: 0, newToday: 0, seen: 0 },
      logRecent: [],
      logToday: [],
      logTypes: [],
      logSeen: [],
      logVersion: 0,
    };
  }

  subscribe = (cb: () => void): (() => void) => {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  };

  getSnapshot = (): RepoState => this.state;

  private set(patch: Partial<RepoState>) {
    this.state = { ...this.state, ...patch };
    for (const cb of this.subs) cb();
  }

  private docs(): LogDocs {
    return {
      get: k => this.p.docGet(k),
      set: (k, v) => this.p.docPut(k, v),
      delete: k => this.p.docDelete(k),
    };
  }

  async start(): Promise<void> {
    this.startedS = this.p.nowS();
    this.rawConfig = await this.p.configAll();
    this.set({ settings: parseSettings(this.rawConfig) });
    this.offConfig = this.p.onConfig((key, value) => void this.onConfig(key, value));
    // the phone can clear the log while the app is open. forget it here too, or the next save would write it back
    this.offDoc = this.p.onDoc((key, value) => {
      if (key === META_KEY && value === null && this.log.count > 0) {
        this.log.forget();
        this.dropSavedPictures();
        this.refreshLog();
      }
    });
    const [cached, offsetS] = await Promise.all([this.readCachedFix(), this.p.utcOffsetS().catch(() => 0)]);
    if (cached) this.set({ fix: cached, fixSource: 'cached' });
    this.set({ offsetS });
    // the airport file and the saved log load in the background, the screens appear without waiting for them
    void this.loadAirports();
    void this.loadLog();
    void this.tick();
    this.timer = setInterval(() => void this.tick(), 1000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.offConfig?.();
    this.offDoc?.();
    this.timer = null;
  }

  // ---- calls from the screens

  setScreen(id: string) {
    this.screen = id;
    if (id === 'arrivals') {
      this.jobs.arrivals.at = 0;
      this.jobs.faa.at = 0;
    }
  }

  setRange(mi: number) {
    if (mi === this.rangeMi) return;
    this.rangeMi = mi;
    // a wider scope needs a wider search
    this.jobs.nearby.at = 0;
  }

  cycleAirport() {
    const n = this.state.nearAny.length;
    if (n) this.set({ airportPick: (this.state.airportPick + 1) % n });
  }

  cycleArrivalsAirport() {
    const n = this.state.nearBig.length;
    if (!n) return;
    this.set({ arrivalsPick: (this.state.arrivalsPick + 1) % n, arrivals: idle(), faa: null });
    this.jobs.arrivals.at = 0;
    this.jobs.faa.at = 0;
  }

  ackAlert() {
    if (this.state.alert) this.set({ alert: null });
  }

  // the log in full, for the screens that list it
  logRows(): LogEntry[] {
    return this.log.all();
  }

  async clearLog() {
    for (const r of this.log.seenRows()) await this.p.docDelete(photoKey(r.hex)).catch(() => undefined);
    this.dropSavedPictures();
    await this.log.clear(this.docs());
    this.refreshLog();
  }

  // ---- the aircraft the Overhead screen is about

  pick(hex: string) {
    this.photoWanted = null;
    this.set({ picked: hex });
  }

  unpick() {
    if (this.state.picked === null) return;
    this.photoWanted = null;
    this.set({ picked: null });
  }

  // the Back button on the Overhead screen: the aircraft being shown is marked as visually verified
  markSeen(): SeenOutcome {
    const shown = shownOf(this.state);
    const a = shown.a;
    const here = this.here();
    if (!a || !here || (!shown.picked && a.distMi > OVERHEAD_MI)) return { kind: 'none', why: shown.picked ? 'lost' : 'zone' };
    const now = this.p.nowS();
    const place = this.state.nearAny[0]?.name ?? '';
    const mark = this.log.markSeen(now, a, place, here);
    // the mark should reach the device soon, not at the next scheduled save
    this.saveAt = 0;
    this.refreshLog();
    void this.keepPicture(a, mark.kind === 'new');
    return { kind: mark.kind, tail: a.reg ?? a.callsign ?? a.hex.toUpperCase(), at: mark.at };
  }

  // keeps the picture on screen for an aircraft marked as visually verified, so the photos view can show it later
  private async keepPicture(a: Aircraft, fresh: boolean) {
    const ph = this.state.photo;
    if (ph.hex !== a.hex || ph.status !== 'done') {
      this.keepWhenReady.add(a.hex);
      return;
    }
    const hit = ph.result.hit;
    const raw = hit && ph.result.kind !== 'none' ? this.photos.rawFor(hit.imageUrl) : null;
    if (!hit || !raw) return;
    const text = encodePhoto({ kind: ph.result.kind, shows: ph.result.shows, mime: raw.mime, credit: hit.credit, bytes: raw.bytes });
    if (!text) return;
    try {
      await this.p.docPut(photoKey(a.hex), text);
      this.forgetSaved(a.hex);
      if (fresh) {
        // one picture falls off the end when there are too many
        const old = this.log.seenRows()[MAX_SAVED_PHOTOS];
        if (old) {
          await this.p.docDelete(photoKey(old.hex)).catch(() => undefined);
          this.forgetSaved(old.hex);
        }
      }
    } catch {
      // the mark stands without a picture
    }
  }

  // the saved picture for a seen-by-eye aircraft, ready to show. null when none was saved
  async savedPhoto(hex: string): Promise<PhotoResult | null> {
    if (this.saved.has(hex)) return this.saved.get(hex) ?? null;
    let result: PhotoResult | null = null;
    try {
      const text = await this.p.docGet(photoKey(hex));
      const d = text ? decodePhoto(text) : null;
      if (d) {
        const url = URL.createObjectURL(new Blob([d.bytes as BlobPart], { type: d.mime }));
        result = { kind: d.kind, hit: { imageUrl: url, credit: d.credit }, shows: d.shows };
      }
    } catch {
      result = null;
    }
    this.saved.set(hex, result);
    while (this.saved.size > KEEP_SAVED_SHOWN) {
      const oldest = this.saved.keys().next().value as string;
      this.forgetSaved(oldest);
    }
    return result;
  }

  private forgetSaved(hex: string) {
    const r = this.saved.get(hex);
    if (r?.hit) URL.revokeObjectURL(r.hit.imageUrl);
    this.saved.delete(hex);
  }

  private dropSavedPictures() {
    for (const hex of [...this.saved.keys()]) this.forgetSaved(hex);
  }

  // ---- settings and caches

  private async onConfig(key: string, value: string | null) {
    if (value === null) delete this.rawConfig[key];
    else this.rawConfig[key] = value;
    const before = this.state.settings;
    const settings = parseSettings(this.rawConfig);
    this.set({ settings });
    const place = (s: Settings) => `${s.manual?.lat},${s.manual?.lon}`;
    if (place(before) !== place(settings)) this.jobs.position.at = 0;
    if (before.airportsMode !== settings.airportsMode || before.airportsCountry !== settings.airportsCountry) {
      this.rebuildAirports(true);
    }
    await this.tick();
  }

  private async readCachedFix(): Promise<Fix | null> {
    try {
      const v = await this.p.storeGet('fix1');
      const f = v ? (JSON.parse(v) as Fix) : null;
      return f && Number.isFinite(f.lat) && Number.isFinite(f.lon) ? { ...f, speedMps: null, headingDeg: null } : null;
    } catch {
      return null;
    }
  }

  private async loadAirports() {
    try {
      this.db = decodeAirports(await this.p.loadAirportData());
      this.rebuildAirports(true);
    } catch (e) {
      this.set({ airportLabel: e instanceof Error ? e.message : 'airport data did not load' });
    }
  }

  private async loadLog() {
    try {
      await this.log.load(this.docs());
    } catch {
      // an unreadable log starts empty rather than blocking the app
    }
    this.refreshLog();
  }

  private refreshLog() {
    const now = this.p.nowS();
    const off = this.state.offsetS;
    this.set({
      logStats: this.log.stats(now, off),
      logRecent: this.log.recent(LOG_LIST_MAX),
      logToday: this.log.today(now, off, LOG_LIST_MAX),
      logTypes: this.log.typeTable(LOG_LIST_MAX),
      logSeen: this.log.seenRows(LOG_LIST_MAX),
      logVersion: this.log.version,
    });
  }

  private rebuildAirports(force: boolean) {
    if (!this.db) return;
    const s = this.state.settings;
    const here = this.here();
    if (!force && !needsRebuild(this.set_, s.airportsMode, here)) return;
    this.set_ = buildWorkingSet(this.db, s.airportsMode, s.airportsCountry, here);
    this.set({
      airportsReady: true,
      airportCount: this.set_.list.length,
      airportLabel: this.set_.label,
    });
    this.refreshNear();
  }

  private here(): Coord | null {
    const { manual } = this.state.settings;
    return manual ?? this.state.fix;
  }

  private refreshNear() {
    const here = this.here();
    if (!here || !this.set_.list.length) {
      this.set({ nearAny: [], nearBig: [] });
      return;
    }
    const nearAny = nearestAirports(this.set_, here, { count: 5 });
    const nearBig = nearestAirports(this.set_, here, { count: 5, commercialOnly: true });
    this.set({
      nearAny,
      nearBig,
      airportPick: Math.min(this.state.airportPick, Math.max(0, nearAny.length - 1)),
      arrivalsPick: Math.min(this.state.arrivalsPick, Math.max(0, nearBig.length - 1)),
    });
  }

  // ---- the scheduler

  private due(job: Job, everyS: number): boolean {
    if (job.busy) return false;
    const now = this.p.nowS();
    if (job.fails > 0) return now - job.at >= retryAfterS(job.fails, job.noAnswer);
    return now - job.at >= everyS;
  }

  private async run(job: Job, work: () => Promise<void>): Promise<void> {
    job.busy = true;
    job.at = this.p.nowS();
    try {
      await work();
      job.fails = 0;
      job.noAnswer = false;
    } catch (e) {
      job.fails++;
      job.noAnswer = e instanceof NoAnswerError;
      throw e;
    } finally {
      job.busy = false;
    }
  }

  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const now = this.p.nowS();
      this.set({ nowS: now });
      const J = this.jobs;
      if (this.due(J.position, EVERY.position)) void this.updatePosition();
      if (this.fixReady(now)) {
        if (this.due(J.nearby, EVERY.nearby)) void this.updateNearby();
        const squawkEvery = this.tracker.hasPending(now) ? EVERY.recheck : EVERY.squawk;
        if (this.due(J.squawk, squawkEvery)) void this.updateSquawks();
        if (this.state.far === null && this.shouldLookWide() && this.due(J.wide, EVERY.wide)) void this.updateWide();
        if (this.screen === 'arrivals') {
          if (this.due(J.arrivals, EVERY.arrivals)) void this.updateArrivals();
          if (this.due(J.faa, EVERY.faa)) void this.updateFaa();
        }
      }
      this.set({ emergencies: this.tracker.active(now) });
      this.maintainPhoto();
      if (this.log.pending && now - this.saveAt >= EVERY.save) {
        this.saveAt = now;
        void this.log.save(this.docs()).catch(() => undefined);
      }
    } finally {
      this.ticking = false;
    }
  }

  // a location saved from last time is only trusted if the phone has not answered after a short wait
  private fixReady(now: number): boolean {
    if (!this.here()) return false;
    return this.state.fixSource !== 'cached' || now - this.startedS > 20;
  }

  private shouldLookWide(): boolean {
    const o = this.state.overhead;
    return this.state.aircraft.status === 'ok' && (!o || o.distMi > OVERHEAD_MI);
  }

  // ---- position

  private async updatePosition() {
    const { manual } = this.state.settings;
    if (manual) {
      const fix: Fix = { ...manual, speedMps: null, headingDeg: null };
      this.setFix(fix, 'manual');
      this.jobs.position.at = this.p.nowS();
      return;
    }
    try {
      await this.run(this.jobs.position, async () => {
        const r = await this.p.getPosition();
        if (!r.ok) throw new Error(r.error);
        this.setFix(r.fix, 'phone');
        void this.p.storePut('fix1', JSON.stringify({ lat: r.fix.lat, lon: r.fix.lon })).catch(() => undefined);
      });
      this.set({ fixError: null });
    } catch (e) {
      this.set({ fixError: e instanceof Error ? e.message : 'Phone location is not available' });
    }
  }

  private setFix(fix: Fix, source: RepoState['fixSource']) {
    const prev = this.state.fix;
    this.set({ fix, fixSource: source, fixError: null });
    // the aircraft keep their positions, only their distance from the user changes
    const list = this.state.aircraft.data;
    if (list && (!prev || prev.lat !== fix.lat || prev.lon !== fix.lon)) {
      const moved = list.map(a => relocate(a, fix));
      this.set({ aircraft: { ...this.state.aircraft, data: moved } });
      this.afterList(moved, false);
    }
    this.rebuildAirports(false);
    this.refreshNear();
  }

  // ---- fetching with fallback between services

  private async gate(url: string) {
    const host = new URL(url).host;
    const wait = (this.hostAt.get(host) ?? 0) + 1100 - Date.now();
    this.hostAt.set(host, Date.now() + Math.max(0, wait));
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
  }

  private async viaProviders<T>(
    order: ProviderId[],
    url: (p: ProviderId) => string,
    parse: (p: ProviderId, json: unknown) => T,
  ): Promise<{ value: T; provider: ProviderId }> {
    const now = this.p.nowS();
    const ready = order.filter(p => (this.down.get(p)?.until ?? 0) <= now);
    const tryList = ready.length ? ready : [order[0]!];
    let last: unknown = new Error('No data source answered');
    for (const p of tryList) {
      try {
        const u = url(p);
        await this.gate(u);
        const json = await fetchJson(this.p, u, { timeoutMs: 15000 });
        const value = parse(p, json);
        this.down.delete(p);
        return { value, provider: p };
      } catch (e) {
        last = e;
        const msg = e instanceof Error ? e.message : '';
        // no phone link means every service would fail the same way, so none of them is blamed
        if (LINK_DOWN.test(msg)) break;
        const d = this.down.get(p) ?? { until: 0, fails: 0 };
        d.fails++;
        d.until = now + Math.min(30 * 2 ** (d.fails - 1), 300);
        this.down.set(p, d);
      }
    }
    throw last;
  }

  // ---- the nearby aircraft

  private async updateNearby() {
    const here = this.here()!;
    const radiusNm = this.radiusNmFor();
    const feed = this.state.aircraft;
    if (feed.data === null) this.set({ aircraft: { data: null, status: 'loading', error: null } });
    try {
      await this.run(this.jobs.nearby, async () => {
        const { value, provider } = await this.viaProviders(
          NEARBY_ORDER,
          p => nearbyUrl(p, here, radiusNm),
          (p, json) => parseProvider(p, json, here),
        );
        const list = value.filter(isAircraftLike);
        this.set({
          aircraft: { data: list, status: 'ok', error: null },
          aircraftAt: this.p.nowS(),
          provider,
          radiusMi: radiusNm * 1.150779,
        });
        this.afterList(list, true);
      });
    } catch (e) {
      this.set({ aircraft: { data: this.state.aircraft.data, status: 'error', error: e instanceof Error ? e.message : 'Update failed' } });
    }
  }

  private radiusNmFor(): number {
    // enough to fill the scope, never less than the 10 mile zone plus room
    const nm = (this.rangeMi * 1.1) / 1.150779;
    return Math.max(20, Math.min(100, Math.ceil(nm)));
  }

  // everything that follows a new or moved list of aircraft
  private afterList(list: Aircraft[], fresh: boolean) {
    const now = this.p.nowS();
    const here = this.here();
    const live = list.filter(a => a.seenPosS <= MAX_AGE_S);
    this.set({ overhead: this.pickOverhead(live) });
    if (!fresh || !here) return;
    this.observe(live.filter(a => isEmergencyCode(a.squawk)));
    const place = this.state.nearAny[0]?.name ?? '';
    const added = this.log.record(now, live, this.state.settings.logMi, place, here);
    if (added || this.log.version !== this.state.logVersion) this.refreshLog();
  }

  private pickOverhead(list: Aircraft[]): Aircraft | null {
    let best: Aircraft | null = null;
    for (const a of list) if (!a.onGround && (!best || a.distMi < best.distMi)) best = a;
    const keep = this.overheadHex ? list.find(a => a.hex === this.overheadHex && !a.onGround) : undefined;
    // stay on the current one unless another is clearly closer
    if (keep && best && keep.distMi <= best.distMi * 1.15 + 0.3) best = keep;
    this.overheadHex = best?.hex ?? null;
    return best;
  }

  // ---- emergencies

  private observe(heard: Aircraft[]) {
    const now = this.p.nowS();
    const fresh = this.tracker.observe(now, heard);
    if (fresh.length) {
      const nearest = [...fresh].sort((a, b) => a.distMi - b.distMi)[0]!;
      this.set({ alert: { n: ++this.alertN, info: nearest, atS: now } });
    }
    this.set({ emergencies: this.tracker.active(now) });
  }

  private async updateSquawks() {
    const here = this.here()!;
    try {
      await this.run(this.jobs.squawk, async () => {
        const heard: Aircraft[] = [];
        for (const code of EMERGENCY_CODES) {
          const { value } = await this.viaProviders(
            SQUAWK_ORDER,
            p => squawkUrl(p, code),
            (p, json) => parseProvider(p, json, here),
          );
          // the lookup is worldwide, only what is inside the alert radius counts
          for (const a of value) if (a.squawk === code && a.distMi <= ALERT_RADIUS_MI) heard.push(a);
        }
        this.observe(heard);
      });
    } catch {
      // the main feed still catches nearby emergencies. the next run tries again
    }
  }

  // ---- a wider look when nothing is overhead

  private async updateWide() {
    const here = this.here()!;
    try {
      await this.run(this.jobs.wide, async () => {
        const { value } = await this.viaProviders(
          NEARBY_ORDER,
          p => nearbyUrl(p, here, 100),
          (p, json) => parseProvider(p, json, here),
        );
        let best: Aircraft | null = null;
        for (const a of value) if (isAircraftLike(a) && !a.onGround && a.seenPosS <= MAX_AGE_S && (!best || a.distMi < best.distMi)) best = a;
        this.set({ far: best ? { distMi: best.distMi, bearingDeg: best.bearingDeg } : { distMi: Infinity, bearingDeg: 0 } });
      });
    } catch {
      // not important
    }
    // the answer is kept for a while, then looked up again
    setTimeout(() => {
      if (this.state.far) this.set({ far: null });
    }, 55000);
  }

  // ---- arrivals

  private selectedBig(): NearAirport | null {
    return this.state.nearBig[this.state.arrivalsPick] ?? null;
  }

  private async updateArrivals() {
    const ap = this.selectedBig();
    if (!ap) return;
    const feed = this.state.arrivals;
    if (feed.data === null) this.set({ arrivals: { data: null, status: 'loading', error: null } });
    try {
      await this.run(this.jobs.arrivals, async () => {
        const { value } = await this.viaProviders(
          NEARBY_ORDER,
          p => nearbyUrl(p, ap, 40),
          (p, json) => parseProvider(p, json, ap),
        );
        const now = this.p.nowS();
        const rows = inbound(value.filter(isAircraftLike), ap, now);
        this.set({ arrivals: { data: rows, status: 'ok', error: null } });
        void this.fetchRoutes(value.filter(a => rows.some(r => r.hex === a.hex)));
      });
    } catch (e) {
      this.set({ arrivals: { data: this.state.arrivals.data, status: 'error', error: e instanceof Error ? e.message : 'Update failed' } });
    }
  }

  private async updateFaa() {
    const ap = this.selectedBig();
    if (!ap) return;
    try {
      await this.run(this.jobs.faa, async () => {
        const list = parseFaa(await fetchText(this.p, FAA_URL, { timeoutMs: 20000 }));
        // the feed names US airports by their three letter code
        this.set({ faa: statusFor(list, ap.code) });
      });
    } catch {
      // the banner is a bonus, no error is shown for it
    }
  }

  // ---- routes

  private async fetchRoutes(list: Aircraft[]) {
    const wanted = list.filter(a => wantsRoute(a) && !this.routeAsked.has(a.callsign!)).slice(0, 8);
    if (!wanted.length) return;
    for (const a of wanted) this.routeAsked.add(a.callsign!);
    try {
      await this.gate(ROUTE_URL);
      const r = await this.p.fetchBytes(ROUTE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: routeBody(wanted),
        timeoutMs: 15000,
      });
      if (!r.ok || r.status < 200 || r.status >= 300) throw new Error('route lookup failed');
      const found = parseRouteSet(JSON.parse(new TextDecoder().decode(r.body)));
      const routes = { ...this.state.routes };
      for (const a of wanted) routes[a.callsign!] = found.get(a.callsign!) ?? null;
      this.set({ routes });
    } catch {
      // allow another try later
      for (const a of wanted) this.routeAsked.delete(a.callsign!);
    }
  }

  // ---- the photo and route of the aircraft overhead

  private maintainPhoto() {
    const shown = shownOf(this.state);
    const o = shown.a;
    const inZone = !!o && (shown.picked || o.distMi <= OVERHEAD_MI);
    if (!inZone || this.screen !== 'overhead') {
      this.photoWanted = null;
      return;
    }
    if (o.hex === this.state.photo.hex && this.state.photo.status !== 'idle') return;
    if (!this.photoWanted || this.photoWanted.hex !== o.hex) {
      this.photoWanted = { hex: o.hex, sinceMs: Date.now() };
      return;
    }
    // wait a moment so a fast fly-by does not trigger a download for every aircraft
    if (Date.now() - this.photoWanted.sinceMs < 2000) return;
    this.photoWanted = null;
    this.set({ photo: { hex: o.hex, status: 'loading', result: NO_PHOTO } });
    const others = this.state.aircraft.data ?? [];
    void this.fetchRoutes([o]);
    void this.photos.find(o, others).then(result => {
      if (this.state.photo.hex !== o.hex) return;
      this.set({ photo: { hex: o.hex, status: 'done', result } });
      if (this.keepWhenReady.delete(o.hex)) void this.keepPicture(o, false);
    });
  }
}


import { localDayStart } from './format';
import type { Aircraft, Coord, LogEntry } from './types';

// the spotter log lives on the device only. it is stored in docs so the settings page on the phone can read it for export.
// a doc may hold 256 KiB, a shard of this many rows is about 30 KiB
export const SHARD_ROWS = 100;
export const MAX_ROWS = 12000;
const TRIM_ROWS = 600;
// an aircraft that goes out of range for this long and comes back counts as a new visit
const VISIT_GAP_S = 900;

export const META_KEY = 'log.meta';
export const shardKey = (i: number) => `log.${i}`;

export interface LogStats {
  total: number;
  types: number;
  newToday: number;
  // aircraft the user marked as visually verified
  seen: number;
}

// one line of the types view
export interface TypeRow {
  code: string;
  name: string;
  count: number;
  // last seen, unix seconds
  last: number;
}

export type SeenMark = { kind: 'new' | 'again'; hex: string; at: number; added: boolean };

export interface LogDocs {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export class SpotterLog {
  private rows: LogEntry[] = [];
  private byHex = new Map<string, number>();
  private dirty = new Set<number>();
  private metaDirty = false;
  // bumps on every change so the ui can tell
  version = 0;

  get count(): number {
    return this.rows.length;
  }

  // records every aircraft close enough. returns how many rows are new
  record(nowS: number, list: Aircraft[], logMi: number, place: string, me: Coord): number {
    let added = 0;
    for (const a of list) {
      if (a.onGround || a.distMi > logMi || a.seenPosS > 30) continue;
      const at = this.byHex.get(a.hex);
      if (at === undefined) {
        this.add(nowS, a, place, me);
        added++;
      } else if (this.touch(at, nowS, a)) this.mark(at);
    }
    if (this.rows.length > MAX_ROWS) this.trim();
    if (added) this.version++;
    return added;
  }

  // marks an aircraft as visually verified. one that is not in the log yet is added. a second mark keeps the first time
  markSeen(nowS: number, a: Aircraft, place: string, me: Coord): SeenMark {
    let at = this.byHex.get(a.hex);
    let added = false;
    if (at === undefined) {
      this.add(nowS, a, place, me);
      at = this.rows.length - 1;
      added = true;
    } else {
      this.touch(at, nowS, a);
    }
    const row = this.rows[at]!;
    if (row.s !== undefined) return { kind: 'again', hex: a.hex, at: row.s, added };
    row.s = nowS;
    this.mark(at);
    this.version++;
    return { kind: 'new', hex: a.hex, at: nowS, added };
  }

  private add(nowS: number, a: Aircraft, place: string, me: Coord) {
    const row: LogEntry = {
      hex: a.hex,
      r: a.reg,
      c: a.callsign,
      t: a.type,
      d: a.desc,
      o: a.operator,
      f: nowS,
      l: nowS,
      m: Math.round(a.distMi * 10),
      b: Math.round(a.bearingDeg),
      h: Math.round((a.altFt ?? 0) / 100),
      n: 1,
      p: [round2(me.lat), round2(me.lon)],
      w: place,
    };
    this.rows.push(row);
    this.byHex.set(a.hex, this.rows.length - 1);
    this.mark(this.rows.length - 1);
    this.metaDirty = true;
  }

  // brings an existing row up to date. true when anything changed
  private touch(at: number, nowS: number, a: Aircraft): boolean {
    const e = this.rows[at]!;
    let changed = false;
    if (nowS - e.l > VISIT_GAP_S) {
      e.n++;
      changed = true;
    }
    // writing every poll would wear the store, so a plain refresh of the last seen time is kept only in memory
    e.l = nowS;
    const m = Math.round(a.distMi * 10);
    if (m < e.m) {
      e.m = m;
      e.b = Math.round(a.bearingDeg);
      changed = true;
    }
    const h = Math.round((a.altFt ?? 0) / 100);
    if (h > e.h) {
      e.h = h;
      changed = true;
    }
    if (!e.r && a.reg) ((e.r = a.reg), (changed = true));
    if (!e.t && a.type) ((e.t = a.type), (changed = true));
    if (!e.d && a.desc) ((e.d = a.desc), (changed = true));
    if (!e.o && a.operator) ((e.o = a.operator), (changed = true));
    if (a.callsign && e.c !== a.callsign) ((e.c = a.callsign), (changed = true));
    if (changed) this.version++;
    return changed;
  }

  private mark(at: number) {
    this.dirty.add(Math.floor(at / SHARD_ROWS));
  }

  // drops the oldest rows and rewrites everything
  private trim() {
    // rows the user marked as visually verified are never the ones dropped
    const marked = this.rows.filter(r => r.s !== undefined);
    const rest = this.rows.filter(r => r.s === undefined).sort((a, b) => b.l - a.l);
    const keep = [...marked, ...rest.slice(0, Math.max(0, MAX_ROWS - TRIM_ROWS - marked.length))];
    keep.sort((a, b) => a.f - b.f);
    this.rows = keep;
    this.byHex = new Map(keep.map((r, i) => [r.hex, i]));
    for (let i = 0; i * SHARD_ROWS < keep.length; i++) this.dirty.add(i);
    this.metaDirty = true;
    this.version++;
  }

  stats(nowS: number, offsetS: number): LogStats {
    const day = localDayStart(nowS, offsetS);
    const types = new Set<string>();
    let newToday = 0;
    let seen = 0;
    for (const r of this.rows) {
      const t = r.t ?? r.d;
      if (t) types.add(t);
      if (r.f >= day) newToday++;
      if (r.s !== undefined) seen++;
    }
    return { total: this.rows.length, types: types.size, newToday, seen };
  }

  // newest first
  recent(n: number): LogEntry[] {
    return [...this.rows].sort((a, b) => b.l - a.l).slice(0, n);
  }

  // first logged today, newest first
  today(nowS: number, offsetS: number, n: number): LogEntry[] {
    const day = localDayStart(nowS, offsetS);
    return this.rows
      .filter(r => r.f >= day)
      .sort((a, b) => b.f - a.f)
      .slice(0, n);
  }

  // marked as visually verified, most recently marked first
  seenRows(n = Infinity): LogEntry[] {
    return this.rows
      .filter(r => r.s !== undefined)
      .sort((a, b) => b.s! - a.s!)
      .slice(0, n);
  }

  // one line per aircraft type, the most logged first
  typeTable(n: number): TypeRow[] {
    const by = new Map<string, TypeRow>();
    for (const r of this.rows) {
      const code = r.t ?? r.d;
      if (!code) continue;
      const row = by.get(code);
      if (row) {
        row.count++;
        if (r.l > row.last) row.last = r.l;
        if (row.name === code && r.d) row.name = r.d;
      } else by.set(code, { code, name: r.d ?? code, count: 1, last: r.l });
    }
    return [...by.values()].sort((a, b) => b.count - a.count || b.last - a.last || a.code.localeCompare(b.code)).slice(0, n);
  }

  all(): LogEntry[] {
    return this.rows;
  }

  get pending(): boolean {
    return this.dirty.size > 0 || this.metaDirty;
  }

  async save(docs: LogDocs): Promise<void> {
    const dirty = [...this.dirty];
    this.dirty.clear();
    const meta = this.metaDirty;
    this.metaDirty = false;
    try {
      for (const i of dirty) {
        const rows = this.rows.slice(i * SHARD_ROWS, (i + 1) * SHARD_ROWS);
        await docs.set(shardKey(i), JSON.stringify(rows));
      }
      if (meta || dirty.length) {
        await docs.set(META_KEY, JSON.stringify({ v: 1, rows: this.rows.length, shards: Math.ceil(this.rows.length / SHARD_ROWS) }));
      }
    } catch (e) {
      // keep the work for the next try
      for (const i of dirty) this.dirty.add(i);
      this.metaDirty = this.metaDirty || meta;
      throw e;
    }
  }

  async load(docs: LogDocs): Promise<void> {
    const metaText = await docs.get(META_KEY);
    if (!metaText) return;
    const meta = JSON.parse(metaText) as { shards?: number };
    const rows: LogEntry[] = [];
    for (let i = 0; i < (meta.shards ?? 0); i++) {
      const text = await docs.get(shardKey(i));
      if (!text) continue;
      const part = JSON.parse(text) as LogEntry[];
      if (Array.isArray(part)) {
        for (const r of part) {
          if (!r || typeof r.hex !== 'string') continue;
          // a row written before marking existed has no mark, and a damaged mark is dropped
          if (r.s !== undefined && typeof r.s !== 'number') delete r.s;
          rows.push(r);
        }
      }
    }
    this.rows = rows;
    this.byHex = new Map(rows.map((r, i) => [r.hex, i]));
    this.version++;
  }

  // drops the rows held here without touching the saved docs, for when something else already cleared them
  forget() {
    this.rows = [];
    this.byHex.clear();
    this.dirty.clear();
    this.metaDirty = false;
    this.version++;
  }

  async clear(docs: LogDocs): Promise<void> {
    const shards = Math.ceil(this.rows.length / SHARD_ROWS);
    this.rows = [];
    this.byHex.clear();
    this.dirty.clear();
    this.metaDirty = false;
    this.version++;
    for (let i = 0; i < shards; i++) await docs.delete(shardKey(i));
    await docs.delete(META_KEY);
  }
}

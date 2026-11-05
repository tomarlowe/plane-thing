// SIMULATED aircraft written for the tests
import { describe, expect, test } from 'bun:test';
import { csvCell, CSV_HEAD, toCsv, toKml } from '../data/export';
import { SpotterLog, SHARD_ROWS, META_KEY, shardKey, type LogDocs } from '../data/log';
import type { Aircraft, LogEntry } from '../data/types';

const me = { lat: 40.744, lon: -74.032 };
const T0 = 1793800000;
const EST = -5 * 3600;

const ac = (o: Partial<Aircraft> = {}): Aircraft => ({
  hex: 'a1b2c3',
  reg: 'N372DN',
  callsign: 'DAL1482',
  type: 'A321',
  desc: 'Airbus A-321',
  operator: 'Delta Air Lines',
  lat: 40.8,
  lon: -74,
  altFt: 3400,
  onGround: false,
  gsKt: 212,
  trackDeg: 264,
  vertFpm: -700,
  squawk: '3421',
  category: 'A3',
  military: false,
  seenPosS: 1,
  distMi: 4.26,
  bearingDeg: 45.4,
  ...o,
});

function memoryDocs() {
  const m = new Map<string, string>();
  const docs: LogDocs = {
    get: async k => m.get(k) ?? null,
    set: async (k, v) => void m.set(k, v),
    delete: async k => void m.delete(k),
  };
  return { m, docs };
}

describe('spotter log', () => {
  test('records an aircraft once, keeps the closest pass and the highest altitude', () => {
    const log = new SpotterLog();
    expect(log.record(T0, [ac()], 10, 'Newark Liberty International Airport', me)).toBe(1);
    expect(log.record(T0 + 30, [ac({ distMi: 1.24, bearingDeg: 100.2, altFt: 5200 })], 10, 'x', me)).toBe(0);
    expect(log.record(T0 + 60, [ac({ distMi: 6, altFt: 1000 })], 10, 'x', me)).toBe(0);
    expect(log.count).toBe(1);
    const r = log.all()[0]!;
    expect(r.m).toBe(12);
    expect(r.b).toBe(100);
    expect(r.h).toBe(52);
    expect(r.n).toBe(1);
    expect(r.f).toBe(T0);
    expect(r.l).toBe(T0 + 60);
    expect(r.w).toBe('Newark Liberty International Airport');
    expect(r.p).toEqual([40.74, -74.03]);
  });
  test('ignores aircraft on the ground, too far, or with an old position', () => {
    const log = new SpotterLog();
    log.record(T0, [ac({ hex: '01', onGround: true }), ac({ hex: '02', distMi: 10.5 }), ac({ hex: '03', seenPosS: 45 })], 10, '', me);
    expect(log.count).toBe(0);
  });
  test('coming back after a long gap counts as a new visit', () => {
    const log = new SpotterLog();
    log.record(T0, [ac()], 10, '', me);
    log.record(T0 + 2000, [ac()], 10, '', me);
    expect(log.all()[0]!.n).toBe(2);
  });
  test('fills in details that were missing the first time', () => {
    const log = new SpotterLog();
    log.record(T0, [ac({ reg: null, operator: null, type: null, desc: null })], 10, '', me);
    log.record(T0 + 5, [ac()], 10, '', me);
    const r = log.all()[0]!;
    expect(r.r).toBe('N372DN');
    expect(r.o).toBe('Delta Air Lines');
    expect(r.t).toBe('A321');
  });
  test('stats count aircraft, types and the ones first seen today', () => {
    const log = new SpotterLog();
    log.record(T0, [ac({ hex: '01' }), ac({ hex: '02', type: 'B738' }), ac({ hex: '03', type: 'B738' })], 10, '', me);
    log.record(T0 + 86400, [ac({ hex: '04', type: 'E175' })], 10, '', me);
    const s = log.stats(T0 + 86400 + 10, EST);
    expect(s.total).toBe(4);
    expect(s.types).toBe(3);
    expect(s.newToday).toBe(1);
  });
  test('recent comes newest first', () => {
    const log = new SpotterLog();
    log.record(T0, [ac({ hex: '01' })], 10, '', me);
    log.record(T0 + 10, [ac({ hex: '02' })], 10, '', me);
    expect(log.recent(5).map(r => r.hex)).toEqual(['02', '01']);
  });
  test('saves in shards, loads back the same rows, and only rewrites what changed', async () => {
    const { m, docs } = memoryDocs();
    const log = new SpotterLog();
    for (let i = 0; i < SHARD_ROWS + 5; i++) log.record(T0 + i, [ac({ hex: i.toString(16).padStart(6, '0') })], 10, 'p', me);
    expect(log.pending).toBe(true);
    await log.save(docs);
    expect(log.pending).toBe(false);
    expect([...m.keys()].sort()).toEqual([META_KEY, shardKey(0), shardKey(1)].sort());
    expect(JSON.parse(m.get(META_KEY)!)).toEqual({ v: 1, rows: SHARD_ROWS + 5, shards: 2 });
    const before0 = m.get(shardKey(0));
    log.record(T0 + 999, [ac({ hex: '000100', distMi: 1 })], 10, 'p', me);
    await log.save(docs);
    expect(m.get(shardKey(0))).toBe(before0);

    const again = new SpotterLog();
    await again.load(docs);
    expect(again.count).toBe(SHARD_ROWS + 6);
    expect(again.all()[0]!.hex).toBe('000000');
    // a returning aircraft is recognised after a reload
    expect(again.record(T0 + 1000, [ac({ hex: '000000' })], 10, 'p', me)).toBe(0);
  });
  test('a failed save keeps the work for the next try', async () => {
    const log = new SpotterLog();
    log.record(T0, [ac()], 10, '', me);
    await expect(log.save({ get: async () => null, set: async () => Promise.reject(new Error('full')), delete: async () => {} })).rejects.toThrow();
    expect(log.pending).toBe(true);
  });
  test('clear removes the docs, forget leaves them alone', async () => {
    const { m, docs } = memoryDocs();
    const log = new SpotterLog();
    log.record(T0, [ac()], 10, '', me);
    await log.save(docs);
    log.forget();
    expect(log.count).toBe(0);
    expect(log.pending).toBe(false);
    expect(m.size).toBe(2);
    const other = new SpotterLog();
    await other.load(docs);
    expect(other.count).toBe(1);
    await other.clear(docs);
    expect(m.size).toBe(0);
  });
});

describe('export', () => {
  const rows = (): LogEntry[] => {
    const log = new SpotterLog();
    log.record(T0, [ac(), ac({ hex: '02', reg: null, callsign: null, operator: null, desc: null, type: 'R44' })], 10, 'Teterboro Airport, "TEB"', me);
    return log.all();
  };
  test('csv starts with the tail number and carries the columns in order', () => {
    const csv = toCsv(rows(), { offsetS: EST, withCoords: false });
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe(CSV_HEAD.join(','));
    expect(CSV_HEAD.slice(0, 5)).toEqual(['Registration', 'Aircraft Type', 'Airline', 'Serial Number', 'Date and Time Seen']);
    expect(lines[1]).toContain(',2026-11-04 08:46,');
    expect(lines[1]).toContain('N372DN,Airbus A-321,Delta Air Lines,,');
    expect(lines[1]).toContain('"Teterboro Airport, ""TEB"""');
    expect(lines[1]).toContain(',DAL1482,A321,4.3,45,3400,1,A1B2C3,');
    // no position columns unless asked for
    expect(lines[0]).not.toContain('Observer');
    expect(lines.at(-1)).toBe('');
  });
  test('an aircraft with no tail number leaves the cell empty', () => {
    const lines = toCsv(rows(), { offsetS: EST, withCoords: false }).slice(1).split('\r\n');
    expect(lines[2]!.startsWith(',R44,')).toBe(true);
  });
  test('position columns appear only when asked for', () => {
    const csv = toCsv(rows(), { offsetS: EST, withCoords: true }).slice(1).split('\r\n');
    expect(csv[0]!.endsWith('Observer Latitude,Observer Longitude')).toBe(true);
    expect(csv[1]!.endsWith(',40.74,-74.03')).toBe(true);
  });
  test('a zone given as a function is used for every row', () => {
    const r = rows();
    const a = toCsv(r, { offsetS: () => 3600, withCoords: false }).split('\r\n')[1]!;
    const b = toCsv(r, { offsetS: 3600, withCoords: false }).split('\r\n')[1]!;
    expect(a).toBe(b);
  });
  test('cells that could run as spreadsheet formulas are defused, plain negatives are not', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('@a')).toBe("'@a");
    expect(csvCell('-cmd')).toBe("'-cmd");
    expect(csvCell('-12.5')).toBe('-12.5');
    expect(csvCell(null)).toBe('');
    expect(csvCell(7)).toBe('7');
    expect(csvCell('a,b')).toBe('"a,b"');
  });
  test('kml has one placemark per sighting at the observer position, with names escaped', () => {
    const r = rows();
    r[0]!.o = 'A & B <Air>';
    const kml = toKml(r, { offsetS: EST, withCoords: true });
    expect(kml.match(/<Placemark>/g)).toHaveLength(2);
    expect(kml).toContain('<coordinates>-74.03,40.74,0</coordinates>');
    expect(kml).toContain('A &amp; B &lt;Air&gt;');
    expect(kml.startsWith('<?xml')).toBe(true);
  });
});

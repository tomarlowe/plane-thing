// SIMULATED aircraft written for the tests
import { describe, expect, test } from 'bun:test';
import { csvCell, CSV_HEAD, toCsv, toKml } from '../data/export';
import { SpotterLog, MAX_ROWS, SHARD_ROWS, META_KEY, shardKey, type LogDocs } from '../data/log';
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

describe('seen by eye', () => {
  test('marking an aircraft already in the log stamps it and counts it', () => {
    const log = new SpotterLog();
    log.record(T0, [ac()], 10, 'p', me);
    const v = log.version;
    const m = log.markSeen(T0 + 120, ac(), 'p', me);
    expect(m).toEqual({ kind: 'new', hex: 'a1b2c3', at: T0 + 120, added: false });
    expect(log.all()[0]!.s).toBe(T0 + 120);
    expect(log.count).toBe(1);
    expect(log.version).toBeGreaterThan(v);
    expect(log.stats(T0 + 130, EST).seen).toBe(1);
  });
  test('a second mark keeps the first time and says it was already marked', () => {
    const log = new SpotterLog();
    log.record(T0, [ac()], 10, 'p', me);
    log.markSeen(T0 + 120, ac(), 'p', me);
    const again = log.markSeen(T0 + 500, ac(), 'p', me);
    expect(again).toEqual({ kind: 'again', hex: 'a1b2c3', at: T0 + 120, added: false });
    expect(log.all()[0]!.s).toBe(T0 + 120);
    expect(log.stats(T0 + 600, EST).seen).toBe(1);
  });
  test('an aircraft that is not in the log yet is added by the mark', () => {
    const log = new SpotterLog();
    const m = log.markSeen(T0, ac({ distMi: 7.3, bearingDeg: 200 }), 'Teterboro Airport', me);
    expect(m).toMatchObject({ kind: 'new', added: true, at: T0 });
    expect(log.count).toBe(1);
    const r = log.all()[0]!;
    expect(r).toMatchObject({ hex: 'a1b2c3', m: 73, b: 200, n: 1, s: T0, w: 'Teterboro Airport' });
    expect(log.stats(T0, EST)).toMatchObject({ total: 1, seen: 1 });
  });
  test('the mark also carries a closer pass or a higher altitude into the row', () => {
    const log = new SpotterLog();
    log.record(T0, [ac()], 10, 'p', me);
    log.markSeen(T0 + 5, ac({ distMi: 1.1, bearingDeg: 90, altFt: 5000 }), 'p', me);
    expect(log.all()[0]).toMatchObject({ m: 11, b: 90, h: 50 });
  });
  test('the mark is saved, survives a reload, and an unmarked log has no marks', async () => {
    const { m, docs } = memoryDocs();
    const log = new SpotterLog();
    log.record(T0, [ac(), ac({ hex: '02' })], 10, 'p', me);
    await log.save(docs);
    expect(log.pending).toBe(false);
    log.markSeen(T0 + 60, ac(), 'p', me);
    expect(log.pending).toBe(true);
    await log.save(docs);
    const back = new SpotterLog();
    await back.load(docs);
    expect(back.all().find(r => r.hex === 'a1b2c3')!.s).toBe(T0 + 60);
    expect(back.all().find(r => r.hex === '02')!.s).toBeUndefined();
    expect(back.stats(T0 + 70, EST).seen).toBe(1);
    // the stored text has no key for an unmarked row
    expect(JSON.parse(m.get(shardKey(0))!)[1]).not.toHaveProperty('s');
  });
  test('rows saved before this existed load without a mark, and a damaged mark is dropped', async () => {
    const { m, docs } = memoryDocs();
    const old = (hex: string, extra: object = {}) => ({ hex, r: null, c: null, t: 'A321', d: null, o: null, f: T0, l: T0, m: 20, b: 10, h: 30, n: 1, p: [40.74, -74.03], w: '', ...extra });
    m.set(META_KEY, JSON.stringify({ v: 1, rows: 3, shards: 1 }));
    m.set(shardKey(0), JSON.stringify([old('01'), old('02', { s: 'yesterday' }), old('03', { s: T0 + 9 })]));
    const log = new SpotterLog();
    await log.load(docs);
    expect(log.count).toBe(3);
    expect(log.all().map(r => r.s)).toEqual([undefined, undefined, T0 + 9]);
    expect(log.seenRows().map(r => r.hex)).toEqual(['03']);
  });
  test('seenRows comes most recently marked first and can be limited', () => {
    const log = new SpotterLog();
    log.record(T0, [ac({ hex: '01' }), ac({ hex: '02' }), ac({ hex: '03' }), ac({ hex: '04' })], 10, 'p', me);
    log.markSeen(T0 + 30, ac({ hex: '02' }), 'p', me);
    log.markSeen(T0 + 10, ac({ hex: '01' }), 'p', me);
    log.markSeen(T0 + 50, ac({ hex: '04' }), 'p', me);
    expect(log.seenRows().map(r => r.hex)).toEqual(['04', '02', '01']);
    expect(log.seenRows(2).map(r => r.hex)).toEqual(['04', '02']);
    expect(new SpotterLog().seenRows()).toEqual([]);
  });
  test('clearing the log forgets the marks too', async () => {
    const { m, docs } = memoryDocs();
    const log = new SpotterLog();
    log.markSeen(T0, ac(), 'p', me);
    await log.save(docs);
    await log.clear(docs);
    expect(log.seenRows()).toEqual([]);
    expect(log.stats(T0, EST).seen).toBe(0);
    expect(m.size).toBe(0);
  });
  test('when the log is trimmed, aircraft marked as seen by eye are kept', () => {
    const log = new SpotterLog();
    const hex = (i: number) => i.toString(16).padStart(6, '0');
    // the oldest aircraft is marked at the time it was first seen, so its last seen time stays the oldest
    for (let i = 0; i < MAX_ROWS; i++) log.record(T0 + i, [ac({ hex: hex(i) })], 10, 'p', me);
    expect(log.count).toBe(MAX_ROWS);
    log.markSeen(T0, ac({ hex: hex(0) }), 'p', me);
    // one more row pushes it over the limit
    log.record(T0 + MAX_ROWS, [ac({ hex: hex(MAX_ROWS) })], 10, 'p', me);
    expect(log.count).toBeLessThan(MAX_ROWS);
    const have = new Set(log.all().map(r => r.hex));
    expect(have.has(hex(0))).toBe(true);
    expect(have.has(hex(MAX_ROWS))).toBe(true);
    // the next oldest, never marked, is the one that went
    expect(have.has(hex(1))).toBe(false);
    expect(log.seenRows().map(r => r.hex)).toEqual([hex(0)]);
    // lookups still point at the right rows after the rewrite
    expect(log.markSeen(T0 + 99999, ac({ hex: hex(0) }), 'p', me).kind).toBe('again');
  });
});

describe('the lists on the log screen', () => {
  const fill = () => {
    const log = new SpotterLog();
    // 3 x B738, 2 x A321, 1 x E175, one with only a long name, one with nothing to name it by
    log.record(T0, [ac({ hex: '01', type: 'B738', desc: 'Boeing 737-800' })], 10, 'p', me);
    log.record(T0 + 10, [ac({ hex: '02', type: 'B738', desc: null })], 10, 'p', me);
    log.record(T0 + 20, [ac({ hex: '03', type: 'A321' })], 10, 'p', me);
    log.record(T0 + 30, [ac({ hex: '04', type: 'B738', desc: 'Boeing 737-800' })], 10, 'p', me);
    log.record(T0 + 40, [ac({ hex: '05', type: 'A321' })], 10, 'p', me);
    log.record(T0 + 50, [ac({ hex: '06', type: 'E175', desc: 'Embraer E175' })], 10, 'p', me);
    log.record(T0 + 60, [ac({ hex: '07', type: null, desc: 'Sample Biplane' })], 10, 'p', me);
    log.record(T0 + 70, [ac({ hex: '08', type: null, desc: null })], 10, 'p', me);
    return log;
  };
  test('the types table counts each type, most logged first, and names it from the long name', () => {
    const t = fill().typeTable(10);
    expect(t.map(r => [r.code, r.count])).toEqual([
      ['B738', 3],
      ['A321', 2],
      ['Sample Biplane', 1],
      ['E175', 1],
    ]);
    expect(t[0]!.name).toBe('Boeing 737-800');
    expect(t[0]!.last).toBe(T0 + 30);
    expect(t[2]!.name).toBe('Sample Biplane');
  });
  test('equal counts go to the one seen most recently, and the table can be limited', () => {
    const t = fill().typeTable(3);
    expect(t).toHaveLength(3);
    expect(t[2]!.code).toBe('Sample Biplane');
    expect(fill().typeTable(0)).toEqual([]);
  });
  test('the types table agrees with the types count in the stats', () => {
    const log = fill();
    expect(log.typeTable(100)).toHaveLength(log.stats(T0 + 80, EST).types);
  });
  test('today lists what was first logged since local midnight, newest first', () => {
    const log = new SpotterLog();
    // 2026-11-03 and 2026-11-04 in New York time
    log.record(T0 - 86400, [ac({ hex: '01' })], 10, 'p', me);
    log.record(T0, [ac({ hex: '02' })], 10, 'p', me);
    log.record(T0 + 60, [ac({ hex: '03' })], 10, 'p', me);
    expect(log.today(T0 + 100, EST, 10).map(r => r.hex)).toEqual(['03', '02']);
    expect(log.today(T0 + 100, EST, 1).map(r => r.hex)).toEqual(['03']);
    expect(log.today(T0 + 100, EST, 10)).toHaveLength(log.stats(T0 + 100, EST).newToday);
    // a day later, nothing from the day before counts
    expect(log.today(T0 + 86400 + 100, EST, 10)).toEqual([]);
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
  test('csv has a Seen by Eye column just before the source, empty unless marked', () => {
    const log = new SpotterLog();
    log.record(T0, [ac(), ac({ hex: '02', reg: null, callsign: null, operator: null, desc: null, type: 'R44' })], 10, 'p', me);
    log.markSeen(T0 + 120, ac(), 'p', me);
    expect(CSV_HEAD.indexOf('Seen by Eye')).toBe(CSV_HEAD.length - 2);
    expect(CSV_HEAD.at(-1)).toBe('Source');
    const lines = toCsv(log.all(), { offsetS: EST, withCoords: false }).slice(1).split('\r\n');
    // the local time of the mark, not the time first seen
    expect(lines[1]).toContain(',A1B2C3,2026-11-04 08:48,"Plane Thing,');
    expect(lines[2]).toContain(',02,,"Plane Thing,');
    const withCoords = toCsv(log.all(), { offsetS: EST, withCoords: true }).slice(1).split('\r\n');
    expect(withCoords[0]!.endsWith('Seen by Eye,Source,Observer Latitude,Observer Longitude')).toBe(true);
  });
  test('the mark time follows a zone given as a function', () => {
    const log = new SpotterLog();
    log.record(T0, [ac()], 10, 'p', me);
    log.markSeen(T0 + 120, ac(), 'p', me);
    const line = toCsv(log.all(), { offsetS: u => (u === T0 + 120 ? 3600 : 0), withCoords: false }).split('\r\n')[1]!;
    expect(line).toContain(',A1B2C3,2026-11-04 14:48,');
    // the time first seen used the other zone
    expect(line).toContain(',2026-11-04 13:46,');
  });
  test('kml says when an aircraft was seen by eye, and leaves the line out when it was not', () => {
    const log = new SpotterLog();
    log.record(T0, [ac(), ac({ hex: '02' })], 10, 'p', me);
    log.markSeen(T0 + 120, ac(), 'p', me);
    const kml = toKml(log.all(), { offsetS: EST, withCoords: true });
    expect(kml).toContain('<name>Plane Thing Log</name>');
    expect(kml.match(/Times Seen: 1/g)).toHaveLength(2);
    expect(kml.match(/Seen by Eye: /g)).toHaveLength(1);
    expect(kml).toContain('Seen by Eye: 2026-11-04 08:48');
  });
});

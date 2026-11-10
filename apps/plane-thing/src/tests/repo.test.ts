// SIMULATED end to end runs of the app's data flow. the whole sky, every service reply, the photos and the phone are
// invented by the simulator, so these show the app's logic works, not that it works against the live services
import { afterEach, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { META_KEY } from '../data/log';
import { emergencyAircraft, OVERHEAD_MI, parseSettings, Repo, shownOf } from '../data/repo';
import { decodePhoto, encodePhoto, MAX_SAVED_PHOTOS, photoKey } from '../data/savedphoto';
import type { Aircraft, EmergencyInfo } from '../data/types';
import { SIM_NOW_S } from '../sim/fixtures';
import { simPlatform } from '../sim/platform';

const airportData = new Uint8Array(readFileSync(new URL('../data/airports.bin.gz', import.meta.url)));
const repos: Repo[] = [];
let saved: string | null = null;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function start(query: string) {
  let t = SIM_NOW_S;
  const p = simPlatform(new URLSearchParams(query), { airportData, clock: () => t });
  const repo = new Repo(p);
  repos.push(repo);
  return {
    p,
    repo,
    step: async (s: number) => {
      t += s;
      await repo.tick();
    },
    state: () => repo.getSnapshot(),
  };
}

async function until(what: string, ok: () => boolean, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (ok()) return;
    await new Promise(r => setTimeout(r, 25));
  }
  throw new Error(`timed out waiting for ${what}`);
}

// starts a run on a platform that already holds some docs, like a device that has been used before
function startWithDocs(query: string, docs: Record<string, string>) {
  const p = simPlatform(new URLSearchParams(query), { airportData, clock: () => SIM_NOW_S });
  const ready = Promise.all(Object.entries(docs).map(([k, v]) => p.docPut(k, v)));
  const repo = new Repo(p);
  repos.push(repo);
  return { p, repo, ready, state: () => repo.getSnapshot() };
}

// waits for a doc to exist, or to be gone
async function docChanged(p: ReturnType<typeof simPlatform>, key: string, present: boolean, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await p.docGet(key);
    if ((v !== null) === present) return v;
    await sleep(25);
  }
  throw new Error(`timed out waiting for doc ${key} to be ${present ? 'there' : 'gone'}`);
}

afterEach(() => {
  for (const r of repos.splice(0)) r.stop();
});

describe('normal sky', () => {
  test('finds the closest aircraft, the airports, and logs what flew close', async () => {
    const h = start('scenario=normal');
    await h.repo.start();
    await until('aircraft', () => h.state().overhead !== null);
    const s = h.state();
    expect(s.aircraft.status).toBe('ok');
    expect(s.provider).toBe('adsblol');
    expect(s.overhead!.callsign).toBe('DAL1482');
    expect(s.overhead!.distMi).toBeLessThan(3);
    await until('airports', () => h.state().airportsReady && h.state().nearBig.length > 0);
    expect(h.state().nearBig[0]!.code).toBe('TEB');
    expect(h.state().nearAny[0]!.kind).toBeGreaterThanOrEqual(2);
    // six aircraft are inside the 10 mile logging distance
    expect(h.state().logStats.total).toBe(6);
  });

  test('looks wider when nothing is overhead', async () => {
    const h = start('scenario=empty');
    await h.repo.start();
    await until('far aircraft', () => h.state().far !== null || h.state().aircraft.status === 'error', 12000);
    expect(h.state().aircraft.status).toBe('ok');
    // the nearest aircraft is outside the 10 mile overhead zone, which is what puts the screen in its empty state
    expect(h.state().overhead === null || h.state().overhead!.distMi > OVERHEAD_MI).toBe(true);
    expect(h.state().far!.distMi).toBeGreaterThan(OVERHEAD_MI);
  });

  test('an estimated route shows up for an airline callsign', async () => {
    const h = start('scenario=normal');
    await h.repo.start();
    await until('route', () => Object.keys(h.state().routes).length > 0, 10000);
    expect(h.state().routes.DAL1482).toEqual({ from: 'ATL', to: 'LGA' });
  });

  test('a photo of the exact aircraft is found', async () => {
    const h = start('scenario=normal&photo=all');
    await h.repo.start();
    await until('photo', () => h.state().photo.status === 'done', 12000);
    expect(h.state().photo.result.kind).toBe('exact');
    expect(h.state().photo.result.hit!.credit.source).toBe('Planespotters.net');
  });

  test('falls back to a picture of the same type when the aircraft has none', async () => {
    const h = start('scenario=normal&photo=type');
    await h.repo.start();
    await until('photo', () => h.state().photo.status === 'done', 15000);
    expect(h.state().photo.result.kind).toBe('type');
    expect(h.state().photo.result.hit!.credit.source).toBe('Wikimedia Commons');
  });

  test('says so when no picture exists anywhere', async () => {
    const h = start('scenario=normal&photo=none');
    await h.repo.start();
    await until('photo', () => h.state().photo.status === 'done', 15000);
    expect(h.state().photo.result.kind).toBe('none');
  });
});

describe('emergency', () => {
  // the clock only moves when the test moves it, so two looks are always apart by whole steps
  async function waitForAlert(h: ReturnType<typeof start>) {
    for (let i = 0; i < 14 && h.state().alert === null; i++) {
      await h.step(6);
      await sleep(1500);
    }
  }

  test('needs two looks apart before it alerts, then alerts once', async () => {
    const h = start('scenario=emergency&emergency_after=0');
    await h.repo.start();
    await until('aircraft', () => h.state().aircraft.status === 'ok');
    // one look alone must not alert
    await sleep(4500);
    expect(h.state().alert).toBeNull();
    await waitForAlert(h);
    const a = h.state().alert!;
    expect(a).not.toBeNull();
    expect(a.info.code).toBe('7700');
    expect(a.info.callsign).toBe('SWA2209');
    expect(a.info.distMi).toBeGreaterThan(50);
    expect(a.info.distMi).toBeLessThan(60);
    expect(h.state().emergencies).toHaveLength(1);
    const n = a.n;
    for (let i = 0; i < 3; i++) {
      await h.step(30);
      await sleep(3500);
    }
    expect(h.state().alert?.n).toBe(n);
  }, 60000);

  test('acknowledging the alert clears it', async () => {
    const h = start('scenario=emergency&emergency_after=0');
    await h.repo.start();
    await until('aircraft', () => h.state().aircraft.status === 'ok');
    await waitForAlert(h);
    expect(h.state().alert).not.toBeNull();
    h.repo.ackAlert();
    expect(h.state().alert).toBeNull();
  }, 60000);
});

describe('failures', () => {
  test('every flight service down shows an error and no aircraft', async () => {
    const h = start('scenario=normal&fail=flights');
    await h.repo.start();
    await until('error', () => h.state().aircraft.status === 'error', 12000);
    expect(h.state().overhead).toBeNull();
  });

  test('a phone without location shows why', async () => {
    const h = start('scenario=normal&fail=position');
    await h.repo.start();
    await until('position error', () => h.state().fixError !== null);
    expect(h.state().fix).toBeNull();
  });

  test('the airport file failing to load is reported', async () => {
    const h = start('scenario=normal&fail=airports');
    await h.repo.start();
    await until('airport error', () => h.state().airportLabel !== '' && !h.state().airportsReady);
    expect(h.state().nearBig).toHaveLength(0);
  });
});

describe('log and the phone', () => {
  test('the log is saved to docs, and clearing it from the phone empties the running app', async () => {
    const h = start('scenario=normal');
    await h.repo.start();
    await until('log rows', () => h.state().logStats.total === 6);
    await h.step(20);
    // the save is not awaited by the tick, so look for it
    await until('doc written', () => {
      void h.p.docGet(META_KEY).then(v => (saved = v));
      return saved !== null;
    }, 5000);
    expect(JSON.parse(saved!)).toMatchObject({ rows: 6, shards: 1 });

    // the phone deletes the log docs, the index last
    await h.p.docDelete('log.0');
    await h.p.docDelete(META_KEY);
    expect(h.state().logStats.total).toBe(0);
    expect(h.state().logRecent).toHaveLength(0);
    expect(await h.p.docGet(META_KEY)).toBeNull();
  });

  test('a saved log is read back when the app starts again', async () => {
    const first = start('scenario=normal');
    await first.repo.start();
    await until('log rows', () => first.state().logStats.total === 6);
    await first.step(20);
    await until('doc written', () => {
      void first.p.docGet(META_KEY).then(v => (saved = v));
      return saved !== null;
    }, 5000);
    first.repo.stop();
    // a second run on a platform that holds the same docs
    const docs = new Map<string, string>();
    for (const k of [META_KEY, 'log.0']) docs.set(k, (await first.p.docGet(k))!);
    const p2 = simPlatform(new URLSearchParams('scenario=empty'), { airportData, clock: () => SIM_NOW_S + 60 });
    for (const [k, v] of docs) await p2.docPut(k, v);
    const repo2 = new Repo(p2);
    repos.push(repo2);
    await repo2.start();
    await until('loaded', () => repo2.getSnapshot().logStats.total === 6);
    expect(repo2.logRows()).toHaveLength(6);
  });
});

describe('which aircraft the Overhead screen is about', () => {
  const air = (o: Partial<Aircraft> = {}): Aircraft => ({
    hex: 'a1',
    reg: 'N1',
    callsign: 'TST1',
    type: 'A320',
    desc: null,
    operator: null,
    lat: 40.8,
    lon: -74,
    altFt: 3000,
    onGround: false,
    gsKt: 200,
    trackDeg: 90,
    vertFpm: 0,
    squawk: '1200',
    category: 'A3',
    military: false,
    seenPosS: 1,
    distMi: 4,
    bearingDeg: 10,
    ...o,
  });
  const emg = (o: Partial<EmergencyInfo> = {}): EmergencyInfo => ({
    code: '7700',
    label: 'General Emergency',
    hex: 'e1',
    callsign: 'EMG1',
    reg: 'N9',
    type: 'B738',
    desc: 'Boeing 737-800',
    distMi: 30,
    bearingDeg: 340,
    altFt: 31000,
    lat: 41,
    lon: -74,
    sinceS: 0,
    lastS: 0,
    ...o,
  });
  const view = (picked: string | null, list: Aircraft[] | null, emergencies: EmergencyInfo[] = [], overhead: Aircraft | null = list?.[0] ?? null) => ({
    picked,
    aircraft: { data: list, status: 'ok' as const, error: null },
    emergencies,
    overhead,
  });

  test('with nothing picked it is the closest aircraft, or nothing', () => {
    const a = air();
    expect(shownOf(view(null, [a]))).toEqual({ a, picked: false, lost: false });
    expect(shownOf(view(null, [], [], null))).toEqual({ a: null, picked: false, lost: false });
  });
  test('a picked aircraft that is still heard is the one shown, not the closest', () => {
    const near = air({ hex: 'near', distMi: 1 });
    const far = air({ hex: 'far', distMi: 14 });
    const s = shownOf(view('far', [near, far], [], near));
    expect(s).toEqual({ a: far, picked: true, lost: false });
  });
  test('a picked aircraft goes stale after 60 seconds without a position', () => {
    expect(shownOf(view('a1', [air({ seenPosS: 60 })])).lost).toBe(false);
    expect(shownOf(view('a1', [air({ seenPosS: 61 })]))).toEqual({ a: null, picked: true, lost: true });
  });
  test('a picked aircraft that has landed or left the list is lost', () => {
    expect(shownOf(view('a1', [air({ onGround: true })])).lost).toBe(true);
    expect(shownOf(view('a1', [air({ hex: 'other' })])).lost).toBe(true);
    expect(shownOf(view('a1', null, [], null)).lost).toBe(true);
  });
  test('a picked emergency aircraft that is not in the nearby list is still shown, without speed or heading', () => {
    const s = shownOf(view('e1', [air()], [emg()]));
    expect(s.picked).toBe(true);
    expect(s.lost).toBe(false);
    expect(s.a).toMatchObject({ hex: 'e1', reg: 'N9', callsign: 'EMG1', type: 'B738', altFt: 31000, distMi: 30, bearingDeg: 340, squawk: '7700' });
    expect(s.a!.gsKt).toBeNull();
    expect(s.a!.trackDeg).toBeNull();
    expect(s.a!.onGround).toBe(false);
  });
  test('the live record wins over the emergency record when both exist', () => {
    const live = air({ hex: 'e1', gsKt: 380, trackDeg: 160 });
    expect(shownOf(view('e1', [live], [emg()])).a).toBe(live);
  });
  test('the emergency stand-in has no operator, category or heading', () => {
    expect(emergencyAircraft(emg())).toMatchObject({ operator: null, category: null, military: false, vertFpm: null, seenPosS: 0 });
  });
});

describe('seen by eye', () => {
  test('there is nothing to mark when no aircraft is within the 10 mile zone', async () => {
    const h = start('scenario=empty');
    await h.repo.start();
    await until('feed', () => h.state().aircraft.status === 'ok');
    expect(h.repo.markSeen()).toEqual({ kind: 'none', why: 'zone' });
    expect(h.state().logStats.seen).toBe(0);
    expect(h.state().logSeen).toHaveLength(0);
  });

  test('marks the closest aircraft once, and a second mark keeps the first time', async () => {
    const h = start('scenario=normal');
    await h.repo.start();
    await until('aircraft', () => h.state().overhead !== null);
    expect(h.repo.markSeen()).toEqual({ kind: 'new', tail: 'N372DN', at: SIM_NOW_S });
    expect(h.state().logStats.seen).toBe(1);
    expect(h.state().logSeen.map(r => r.hex)).toEqual(['a1c001']);
    // a second later, still the same aircraft
    await h.step(1);
    expect(h.repo.markSeen()).toEqual({ kind: 'again', tail: 'N372DN', at: SIM_NOW_S });
    expect(h.state().logStats.seen).toBe(1);
  });

  test('a picked aircraft is marked even outside the zone, and unpicking goes back to the closest', async () => {
    const h = start('scenario=normal');
    await h.repo.start();
    await until('aircraft', () => h.state().overhead !== null && h.state().aircraft.data!.some(a => a.hex === 'a1c006'));
    h.repo.pick('a1c006');
    const s = shownOf(h.state());
    expect(s).toMatchObject({ picked: true, lost: false });
    expect(s.a!.hex).toBe('a1c006');
    expect(s.a!.distMi).toBeGreaterThan(OVERHEAD_MI);
    // it was too far for the log to have recorded it, so the mark adds the row
    expect(h.state().logRecent.some(r => r.hex === 'a1c006')).toBe(false);
    expect(h.repo.markSeen()).toEqual({ kind: 'new', tail: 'N77865', at: SIM_NOW_S });
    expect(h.state().logSeen.map(r => r.hex)).toEqual(['a1c006']);
    expect(h.state().logRecent.some(r => r.hex === 'a1c006')).toBe(true);
    h.repo.unpick();
    expect(h.state().picked).toBeNull();
    expect(shownOf(h.state())).toMatchObject({ picked: false, lost: false });
    expect(shownOf(h.state()).a!.hex).toBe('a1c001');
  });

  test('a picked aircraft that is not heard cannot be marked', async () => {
    const h = start('scenario=normal');
    await h.repo.start();
    await until('aircraft', () => h.state().overhead !== null);
    h.repo.pick('ffffff');
    expect(shownOf(h.state())).toEqual({ a: null, picked: true, lost: true });
    expect(h.repo.markSeen()).toEqual({ kind: 'none', why: 'lost' });
    expect(h.state().logStats.seen).toBe(0);
  });

  test('marking saves the picture with its credit, and it reads back', async () => {
    const h = start('scenario=normal&photo=all');
    await h.repo.start();
    await until('aircraft', () => h.state().overhead !== null);
    await until('photo', () => h.state().photo.status === 'done' && h.state().photo.hex === 'a1c001', 12000);
    h.repo.markSeen();
    const text = await docChanged(h.p, photoKey('a1c001'), true);
    const d = decodePhoto(text!)!;
    expect(d).toMatchObject({ kind: 'exact', mime: 'image/jpeg' });
    expect(d.credit.source).toBe('Planespotters.net');
    expect(d.credit.photographer).toBe('Sample Photographer');
    expect(d.bytes.length).toBeGreaterThan(0);
    const back = await h.repo.savedPhoto('a1c001');
    expect(back).toMatchObject({ kind: 'exact', shows: null });
    expect(back!.hit!.credit.link).toBe(d.credit.link);
    expect(back!.hit!.imageUrl.startsWith('blob:')).toBe(true);
    // the second look is the same object, and an aircraft with nothing saved reads as nothing
    expect(await h.repo.savedPhoto('a1c001')).toBe(back);
    expect(await h.repo.savedPhoto('a1c002')).toBeNull();
  });

  test('marking before the picture has loaded saves it when it arrives', async () => {
    const h = start('scenario=normal&photo=all');
    await h.repo.start();
    await until('aircraft', () => h.state().overhead !== null);
    expect(h.state().photo.status).not.toBe('done');
    h.repo.markSeen();
    expect(await h.p.docGet(photoKey('a1c001'))).toBeNull();
    const text = await docChanged(h.p, photoKey('a1c001'), true, 12000);
    expect(decodePhoto(text!)).not.toBeNull();
  });

  test('an aircraft with no picture anywhere is still marked, and nothing is saved for it', async () => {
    const h = start('scenario=normal&photo=none');
    await h.repo.start();
    await until('aircraft', () => h.state().overhead !== null);
    await until('photo', () => h.state().photo.status === 'done', 15000);
    expect(h.repo.markSeen().kind).toBe('new');
    await sleep(300);
    expect(await h.p.docGet(photoKey('a1c001'))).toBeNull();
    expect(await h.repo.savedPhoto('a1c001')).toBeNull();
    expect(h.state().logStats.seen).toBe(1);
  });

  test('only the most recent pictures are kept, and the oldest loses its picture but not its row', async () => {
    const credit = { photographer: 'Earlier Photographer', source: 'Planespotters.net', link: 'https://www.planespotters.net/photo/9' };
    const pic = encodePhoto({ kind: 'exact', shows: null, mime: 'image/jpeg', credit, bytes: new Uint8Array([1, 2, 3]) })!;
    const hexOf = (i: number) => `b0${i.toString(16).padStart(4, '0')}`;
    const before = SIM_NOW_S - 90000;
    const rows = Array.from({ length: MAX_SAVED_PHOTOS }, (_, i) => ({
      hex: hexOf(i), r: null, c: null, t: 'A320', d: null, o: null,
      f: before + i, l: before + i, m: 20, b: 10, h: 30, n: 1, p: [40.74, -74.03], w: '', s: before + i,
    }));
    const docs: Record<string, string> = { [META_KEY]: JSON.stringify({ v: 1, rows: rows.length, shards: 1 }), 'log.0': JSON.stringify(rows) };
    for (const r of rows) docs[photoKey(r.hex)] = pic;
    const h = startWithDocs('scenario=normal&photo=all', docs);
    await h.ready;
    await h.repo.start();
    await until('log loaded', () => h.state().logStats.seen === MAX_SAVED_PHOTOS);
    await until('aircraft', () => h.state().overhead !== null);
    await until('photo', () => h.state().photo.status === 'done' && h.state().photo.hex === 'a1c001', 12000);
    expect(h.repo.markSeen().kind).toBe('new');
    await docChanged(h.p, photoKey('a1c001'), true);
    await docChanged(h.p, photoKey(hexOf(0)), false);
    // the next oldest keeps its picture, and every row is still in the log
    expect(await h.p.docGet(photoKey(hexOf(1)))).not.toBeNull();
    expect(await h.p.docGet(photoKey(hexOf(MAX_SAVED_PHOTOS - 1)))).not.toBeNull();
    expect(h.state().logStats.seen).toBe(MAX_SAVED_PHOTOS + 1);
    expect(h.state().logSeen.some(r => r.hex === hexOf(0))).toBe(true);
  });

  test('clearing the log in the app removes the saved pictures too', async () => {
    const h = start('scenario=normal&photo=all');
    await h.repo.start();
    await until('aircraft', () => h.state().overhead !== null);
    await until('photo', () => h.state().photo.status === 'done' && h.state().photo.hex === 'a1c001', 12000);
    h.repo.markSeen();
    await docChanged(h.p, photoKey('a1c001'), true);
    expect(await h.repo.savedPhoto('a1c001')).not.toBeNull();
    await h.repo.clearLog();
    expect(await h.p.docGet(photoKey('a1c001'))).toBeNull();
    expect(h.state().logStats.seen).toBe(0);
    expect(h.state().logSeen).toHaveLength(0);
    expect(await h.repo.savedPhoto('a1c001')).toBeNull();
  });

  test('when the phone clears the log, the marks leave the running app', async () => {
    const h = start('scenario=normal');
    await h.repo.start();
    await until('aircraft', () => h.state().overhead !== null);
    h.repo.markSeen();
    await h.step(20);
    await docChanged(h.p, META_KEY, true, 5000);
    expect(h.state().logStats.seen).toBe(1);
    await h.p.docDelete('log.0');
    await h.p.docDelete(META_KEY);
    expect(h.state().logStats.seen).toBe(0);
    expect(h.state().logSeen).toHaveLength(0);
  });
});

describe('settings', () => {
  test('defaults', () => {
    const s = parseSettings({});
    expect(s).toMatchObject({ units: 'imperial', clock24: false, manual: null, airportsMode: 'auto', logMi: 10, emergencyJump: true, dialReverse: false });
    expect(s.watch).toEqual([]);
  });
  test('values from the phone', () => {
    const s = parseSettings({
      units: 'metric',
      clock: '24',
      location_mode: 'manual',
      manual_lat: '40.6413',
      manual_lon: '-73.7781',
      airports_mode: 'country',
      airports_country: ' gb ',
      log_distance: '25',
      watch_list: 'dal, n123ab',
      emergency_jump: 'false',
      dial_reverse: 'true',
    });
    expect(s).toMatchObject({
      units: 'metric',
      clock24: true,
      manual: { lat: 40.6413, lon: -73.7781 },
      airportsMode: 'country',
      airportsCountry: 'GB',
      logMi: 25,
      emergencyJump: false,
      dialReverse: true,
    });
    expect(s.watch).toEqual(['DAL', 'N123AB']);
  });
  test('nonsense falls back to the defaults', () => {
    const s = parseSettings({ units: 'furlongs', log_distance: '900', airports_mode: 'moon', location_mode: 'manual', manual_lat: '0', manual_lon: '0' });
    expect(s).toMatchObject({ units: 'imperial', logMi: 10, airportsMode: 'auto', manual: null });
  });
});

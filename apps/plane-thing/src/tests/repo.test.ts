// SIMULATED end to end runs of the app's data flow. the whole sky, every service reply, the photos and the phone are
// invented by the simulator, so these show the app's logic works, not that it works against the live services
import { afterEach, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { META_KEY } from '../data/log';
import { OVERHEAD_MI, parseSettings, Repo } from '../data/repo';
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

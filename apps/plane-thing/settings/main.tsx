import { ConfigForm, closeSettings, type ConfigFormHandle } from '@bridgething/client/form';
import { settings, type SettingsContext } from '@bridgething/client/settings';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { toCsv, toKml } from '../src/data/export';
import { META_KEY } from '../src/data/log';
import type { LogEntry } from '../src/data/types';
import { COUNTRIES } from './countries';
import './style.css';

const FILE_STEM = 'plane-thing-log';

const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

// a row from the device that the export code can safely use
function usable(r: unknown): r is LogEntry {
  if (!r || typeof r !== 'object') return false;
  const e = r as Record<string, unknown>;
  return (
    typeof e.hex === 'string' &&
    num(e.f) &&
    num(e.l) &&
    num(e.m) &&
    num(e.b) &&
    num(e.h) &&
    num(e.n) &&
    Array.isArray(e.p) &&
    e.p.length === 2 &&
    num(e.p[0]) &&
    num(e.p[1])
  );
}

// the log is saved on the device as numbered docs plus one small index. read them back in order, one doc at a time,
// because the device keeps other docs that are far bigger and are of no use here
async function readLog(): Promise<LogEntry[]> {
  const metaText = (await settings.doc.get(META_KEY)).value;
  if (!metaText) return [];
  const meta = JSON.parse(metaText) as { shards?: number };
  const rows: LogEntry[] = [];
  for (let i = 0; i < (meta.shards ?? 0); i++) {
    const text = (await settings.doc.get(`log.${i}`)).value;
    if (!text) continue;
    try {
      const part: unknown = JSON.parse(text);
      if (Array.isArray(part)) rows.push(...part.filter(usable));
    } catch {
      // one unreadable piece should not hide the rest
    }
  }
  return rows;
}

// the offset of the phone's own clock at that moment, so a daylight saving change lands on the right rows
const phoneOffsetS = (unixS: number) => -new Date(unixS * 1000).getTimezoneOffset() * 60;

function saveFile(name: string, mime: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fall through to the older way
  }
  const box = document.createElement('textarea');
  box.value = text;
  box.setAttribute('readonly', '');
  box.style.position = 'fixed';
  box.style.opacity = '0';
  document.body.appendChild(box);
  box.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  box.remove();
  return ok;
}

const noBom = (s: string) => s.replace(/^﻿/, '');

function LogSection() {
  const [rows, setRows] = useState<LogEntry[] | null>(null);
  const [problem, setProblem] = useState('');
  const [coords, setCoords] = useState(false);
  const [shown, setShown] = useState<'csv' | 'kml' | null>(null);
  const [armed, setArmed] = useState(false);
  const [note, setNote] = useState('');
  const wait = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    try {
      setRows(await readLog());
      setProblem('');
    } catch (err) {
      setProblem(errText(err));
    }
  }, []);

  useEffect(() => {
    void reload();
    const offRefresh = settings.onRefresh(() => void reload());
    // the device writes the log as it goes, so look again a moment after it changes
    const offDoc = settings.onDocChanged(key => {
      if (!key.startsWith('log.')) return;
      if (wait.current) clearTimeout(wait.current);
      wait.current = setTimeout(() => void reload(), 1500);
    });
    return () => {
      offRefresh();
      offDoc();
      if (wait.current) clearTimeout(wait.current);
    };
  }, [reload]);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 6000);
    return () => clearTimeout(t);
  }, [armed]);

  const csv = () => toCsv(rows ?? [], { offsetS: phoneOffsetS, withCoords: coords });
  const kml = () => toKml(rows ?? [], { offsetS: phoneOffsetS, withCoords: true });

  function download(kind: 'csv' | 'kml') {
    try {
      if (kind === 'csv') saveFile(`${FILE_STEM}.csv`, 'text/csv;charset=utf-8', csv());
      else saveFile(`${FILE_STEM}.kml`, 'application/vnd.google-earth.kml+xml', kml());
      setNote(`Asked the phone to save ${FILE_STEM}.${kind}. If nothing shows up in your downloads, use Copy or Show Text instead.`);
    } catch (err) {
      setNote(`Saving a file did not work here (${errText(err)}). Use Copy or Show Text instead.`);
    }
  }

  async function copy(kind: 'csv' | 'kml') {
    const ok = await copyText(noBom(kind === 'csv' ? csv() : kml()));
    setNote(ok ? `Copied the ${kind.toUpperCase()} text. Paste it into a note or a spreadsheet.` : 'The phone refused to copy. Use Show text, then select and copy by hand.');
  }

  async function clearAll() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    try {
      const metaText = (await settings.doc.get(META_KEY)).value;
      const shards = metaText ? ((JSON.parse(metaText) as { shards?: number }).shards ?? 0) : 0;
      for (let i = 0; i < shards; i++) await settings.doc.delete(`log.${i}`);
      // the pictures kept for aircraft marked as visually verified go with the log
      for (const r of rows ?? []) if (r.s !== undefined) await settings.doc.delete(`photo.${r.hex}`);
      // the index goes last: the app clears its own copy when it sees the index disappear
      await settings.doc.delete(META_KEY);
      setShown(null);
      setNote('The log is empty now.');
      await reload();
    } catch (err) {
      setNote(`The log was not fully cleared: ${errText(err)}`);
    }
  }

  const count = rows?.length ?? 0;
  const types = new Set((rows ?? []).map(r => r.t ?? r.d).filter(Boolean)).size;
  const empty = rows !== null && count === 0;

  return (
    <section className="log">
      <h2>Spotter Log</h2>
      <p className="note">
        {problem
          ? `Could not read the log from your Car Thing: ${problem}`
          : rows === null
            ? 'Reading the log from your Car Thing...'
            : empty
              ? 'Nothing logged yet. Aircraft are logged while the app is open and they fly within the logging distance.'
              : `${count.toLocaleString()} aircraft logged, ${types.toLocaleString()} different types.`}
      </p>
      <p className="note">
        The log lives on your Car Thing and nowhere else. The files below are made on this phone and go only where you send them. They start with
        tail number, type, airline and time.
      </p>

      <label className="check">
        <input type="checkbox" checked={coords} onChange={e => setCoords(e.currentTarget.checked)} />
        <span>Add my position (latitude and longitude of where I was) to the CSV. Off by default.</span>
      </label>

      <div className="row wrap">
        <button type="button" disabled={empty || rows === null} onClick={() => download('csv')}>
          Download CSV
        </button>
        <button type="button" className="secondary" disabled={empty || rows === null} onClick={() => void copy('csv')}>
          Copy CSV
        </button>
        <button type="button" className="secondary" disabled={empty || rows === null} onClick={() => setShown(shown === 'csv' ? null : 'csv')}>
          {shown === 'csv' ? 'Hide Text' : 'Show Text'}
        </button>
      </div>
      <div className="row wrap">
        <button type="button" className="secondary" disabled={empty || rows === null} onClick={() => download('kml')}>
          Download Map File (KML)
        </button>
        <button type="button" className="secondary" disabled={empty || rows === null} onClick={() => void copy('kml')}>
          Copy KML
        </button>
      </div>
      <p className="note small">A map file puts each sighting where you stood, so it always includes your position.</p>

      {shown === 'csv' && !empty && (
        <textarea className="dump" readOnly rows={8} value={noBom(csv())} onFocus={e => e.currentTarget.select()} />
      )}

      <div className="row wrap">
        <button type="button" className={armed ? 'danger' : 'secondary'} disabled={empty || rows === null} onClick={() => void clearAll()}>
          {armed ? `Tap Again to Delete ${count.toLocaleString()} Sightings` : 'Clear the Log'}
        </button>
      </div>
      <p className="note small">Clearing cannot be undone. Export first if you want to keep a copy.</p>
      <p className="status">{note}</p>
    </section>
  );
}

function CountryCodes() {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const shown = needle ? COUNTRIES.filter(([code, name]) => code.toLowerCase() === needle || name.toLowerCase().includes(needle)) : COUNTRIES;
  return (
    <details className="codes">
      <summary>Country Codes</summary>
      <input type="search" placeholder="Search by Country Name" value={q} onChange={e => setQ(e.currentTarget.value)} />
      <ul>
        {shown.map(([code, name]) => (
          <li key={code}>
            <b>{code}</b> {name}
          </li>
        ))}
        {shown.length === 0 && <li>No country matches that.</li>}
      </ul>
    </details>
  );
}

function Settings() {
  const form = useRef<ConfigFormHandle>(null);
  const [ctx, setCtx] = useState<SettingsContext | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    settings.context().then(setCtx, (err: unknown) => setStatus(errText(err)));
    return settings.onRefresh(setCtx);
  }, []);

  async function close() {
    try {
      await closeSettings(form.current);
    } catch (err) {
      setStatus(errText(err));
    }
  }

  return (
    <main>
      <h1>Plane Thing Settings</h1>
      <p className="hint">{ctx ? `version ${ctx.version}` : 'connecting to the phone app...'}</p>

      <section className="help">
        <h2>Controls</h2>
        <ul>
          <li>Buttons 1 to 4: Overhead, Radar, Watchlist, Log &amp; Photos</li>
          <li>Small recessed button: Arrivals (landings at the nearest airport)</li>
          <li>Dial: zooms the radar, or scrolls a list. Click the dial on Radar to switch between scope and list, and again to open the highlighted aircraft. On Log &amp; Photos, click the dial to step through its four views</li>
          <li>Back button: on Overhead, marks the aircraft you are looking at as visually verified</li>
          <li>Touch an aircraft on Radar to open it on Overhead. Touch the airport chip on Radar to look at the next airport</li>
        </ul>
      </section>

      <ConfigForm ref={form} />

      <CountryCodes />

      <LogSection />

      <div className="row">
        <button type="button" onClick={close}>
          Done
        </button>
      </div>

      <p className="status">{status}</p>

      <section className="credits">
        <h2>Data Sources</h2>
        <p>
          Live aircraft positions come from volunteers who run ADS-B receivers, shared by <a href="https://adsb.lol/">adsb.lol</a> (Open
          Database License), <a href="https://airplanes.live/">airplanes.live</a> (non-commercial use) and{' '}
          <a href="https://adsb.fi/">adsb.fi</a> (personal and non-commercial use). Photos: <a href="https://www.planespotters.net/">Planespotters.net</a>, <a href="https://www.airport-data.com/">airport-data.com</a>{' '}
          and <a href="https://commons.wikimedia.org/">Wikimedia Commons</a>, credited beside each photo on the screen. Airports:{' '}
          <a href="https://ourairports.com/">OurAirports</a> (public domain). Delays: FAA National Airspace System status.
        </p>
        <p>
          Positions can be late, wrong or missing, and arrival times are estimates. Plane Thing is for fun. It is not for navigation or safety.
        </p>
      </section>
    </main>
  );
}

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

createRoot(document.getElementById('root')!).render(<Settings />);

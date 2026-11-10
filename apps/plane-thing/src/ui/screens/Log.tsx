import { useEffect, useState, type ReactNode } from 'react';
import { clock, dateTime, dirText, localDayStart } from '../../data/format';
import type { PhotoResult } from '../../data/photos';
import type { RepoState } from '../../data/repo';
import { fmtDist } from '../../data/units';
import type { LogEntry } from '../../data/types';
import { BLUE, GREEN, LAVENDER, MUTED, ROW_PALS, YELLOW, type Pal } from '../theme';
import { CameraGlyph, DownloadGlyph, EyeGlyph, PlaneGlyph, PlusCircleGlyph, TagGlyph } from '../icons';
import { useApp, useRepo, type LogView } from '../state';

export const LOG_ROWS_SHOWN = 4;

// how many lines the dial can scroll through in a view
export function logViewLength(s: RepoState, v: LogView): number {
  return v === 'list' ? s.logRecent.length : v === 'today' ? s.logToday.length : v === 'types' ? s.logTypes.length : s.logSeen.length;
}

const TITLES: Record<LogView, { title: string; hint: string }> = {
  list: { title: 'Recent Sightings', hint: 'Turn Dial to Scroll' },
  types: { title: 'Types Logged', hint: 'Most Logged First · Turn Dial to Scroll' },
  today: { title: 'First Logged Today', hint: 'Newest First · Turn Dial to Scroll' },
  photos: { title: 'Seen by Eye', hint: 'Turn Dial for Next Photo' },
};

export default function Log() {
  const s = useRepo();
  const { nav } = useApp();
  const view = nav.logView;
  const { total, types, newToday, seen } = s.logStats;
  return (
    <>
      <div style={{ height: 100, flex: 'none', display: 'flex', gap: 12 }}>
        <Card pal={LAVENDER} label="Aircraft Logged" value={total} on={view === 'list'} onPick={() => nav.setLogView('list')} icon={<PlaneGlyph size={26} color={LAVENDER.accent} />} />
        <Card pal={GREEN} label="Different Types" value={types} on={view === 'types'} onPick={() => nav.setLogView('types')} icon={<TagGlyph size={26} color={GREEN.accent} />} />
        <Card pal={YELLOW} label="New Today" value={newToday} on={view === 'today'} onPick={() => nav.setLogView('today')} icon={<PlusCircleGlyph size={26} color={YELLOW.accent} />} />
        <Card pal={BLUE} label="Visually Identified" value={seen} on={view === 'photos'} onPick={() => nav.setLogView('photos')} icon={<CameraGlyph size={26} color={BLUE.soft} />} />
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {view === 'photos' ? <PhotosView s={s} index={nav.photoIndex} /> : <Table s={s} view={view} index={nav.logIndex} />}
      </div>
    </>
  );
}

function Card({ pal, label, value, on, onPick, icon }: { pal: Pal; label: string; value: number; on: boolean; onPick: () => void; icon: ReactNode }) {
  return (
    <div
      onPointerDown={onPick}
      style={{
        flex: 1,
        minWidth: 0,
        background: pal.bg,
        borderRadius: 28,
        padding: '8px 14px',
        color: pal.ink,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        opacity: on ? 1 : 0.55,
        boxShadow: on ? '0 0 0 4px #EAF0FB' : undefined,
      }}>
      <div style={{ minHeight: 34, fontSize: 15, fontWeight: 700, lineHeight: 1.12, color: pal.soft }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 46, fontWeight: 800, lineHeight: 1 }}>{value.toLocaleString('en-US')}</div>
        {icon}
      </div>
    </div>
  );
}

function Header({ view, right }: { view: LogView; right?: ReactNode }) {
  const t = TITLES[view];
  return (
    <div style={{ height: 34, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{t.title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: MUTED }}>{t.hint}</span>
        {right}
      </div>
    </div>
  );
}

const columnStyle = {
  height: 16,
  flex: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '0 22px',
  fontSize: 13,
  fontWeight: 700,
  color: MUTED,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
} as const;

// the three scrolling tables: every sighting, the types, and today's
function Table({ s, view, index }: { s: RepoState; view: Exclude<LogView, 'photos'>; index: number }) {
  const [note, setNote] = useState(false);
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(false), 7000);
    return () => clearTimeout(t);
  }, [note]);
  const len = logViewLength(s, view);
  const first = Math.max(0, Math.min(index, len - LOG_ROWS_SHOWN));
  const empty =
    view === 'today'
      ? 'No new aircraft today yet.'
      : `Nothing logged yet. Aircraft are added when they pass within ${s.settings.logMi} miles.`;
  return (
    <>
      <Header
        view={view}
        right={
          view === 'list' ? (
            <div
              onPointerDown={() => setNote(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: 34,
                background: '#9CC4FF',
                color: '#00315E',
                borderRadius: 17,
                padding: '0 16px',
                fontSize: 16,
                fontWeight: 700,
                lineHeight: 1,
              }}>
              <DownloadGlyph size={18} />
              Export CSV
            </div>
          ) : null
        }
      />

      {note && view === 'list' ? (
        <div style={{ flex: 'none', background: '#9CC4FF', color: '#00315E', borderRadius: 22, padding: '10px 20px', fontSize: 17, fontWeight: 700, lineHeight: 1.25 }}>
          Export happens on your phone. Open this app&apos;s settings in the Car Thing app, then choose Download CSV.
        </div>
      ) : view === 'types' ? (
        <div style={columnStyle}>
          <div style={{ width: 134, flex: 'none' }}>Type</div>
          <div style={{ flex: 1, minWidth: 0 }}>Aircraft</div>
          <div style={{ width: 112, flex: 'none' }}>Last Seen</div>
          <div style={{ width: 60, flex: 'none', textAlign: 'right' }}>Logged</div>
        </div>
      ) : (
        <div style={columnStyle}>
          <div style={{ width: 134, flex: 'none' }}>Tail Number</div>
          <div style={{ flex: 1, minWidth: 0 }}>Type · Operator</div>
          <div style={{ width: 112, flex: 'none' }}>Closest</div>
          <div style={{ width: 86, flex: 'none' }}>First Seen</div>
          <div style={{ width: 40, flex: 'none', textAlign: 'right' }}>Seen</div>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {len === 0 ? <div style={{ fontSize: 20, fontWeight: 600, color: MUTED, padding: '18px 8px' }}>{empty}</div> : null}
        {view === 'types'
          ? s.logTypes.slice(first, first + LOG_ROWS_SHOWN).map((t, i) => (
              <TypeRow key={t.code} t={t} s={s} pal={ROW_PALS[(first + i) % ROW_PALS.length]!} />
            ))
          : (view === 'today' ? s.logToday : s.logRecent).slice(first, first + LOG_ROWS_SHOWN).map((r, i) => (
              <SightingRow key={r.hex} r={r} s={s} pal={ROW_PALS[(first + i) % ROW_PALS.length]!} showNew={view === 'list'} />
            ))}
        {len > LOG_ROWS_SHOWN ? <Scrollbar first={first} shown={LOG_ROWS_SHOWN} len={len} /> : null}
      </div>
    </>
  );
}

// where you are in a long list, drawn at the right edge
function Scrollbar({ first, shown, len }: { first: number; shown: number; len: number }) {
  return (
    <div style={{ position: 'absolute', right: -11, top: 0, bottom: 0, width: 4, borderRadius: 2, background: '#171717' }}>
      <div style={{ position: 'absolute', left: 0, width: 4, top: `${(first / len) * 100}%`, height: `${(shown / len) * 100}%`, borderRadius: 2, background: '#5B6472' }} />
    </div>
  );
}

// the date for an old sighting, the time for one from today
function when(s: RepoState, unixS: number): string {
  const today = localDayStart(s.nowS, s.offsetS);
  return unixS >= today ? clock(unixS, s.offsetS, s.settings.clock24) : dateTime(unixS, s.offsetS, s.settings.clock24).split(',')[0]!;
}

function SightingRow({ r, s, pal, showNew }: { r: LogEntry; s: RepoState; pal: Pal; showNew: boolean }) {
  const u = s.settings.units;
  const today = localDayStart(s.nowS, s.offsetS);
  const isNew = r.f >= today;
  const what = [r.t ?? r.d, r.o].filter(Boolean).join(' · ');
  return (
    <div
      style={{
        height: 48,
        flex: 'none',
        background: pal.bg,
        borderRadius: 22,
        padding: '0 18px',
        color: pal.ink,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
      <div style={{ width: 134, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 24, fontWeight: 800, lineHeight: 1, whiteSpace: 'nowrap' }}>{r.r ?? r.c ?? r.hex.toUpperCase()}</span>
        {r.s !== undefined ? <EyeGlyph size={19} color={pal.ink} style={{ flex: 'none' }} /> : null}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, fontSize: 17, fontWeight: 700, whiteSpace: 'nowrap' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{what}</span>
        {showNew && isNew ? (
          <span style={{ background: pal.chip, color: pal.chipInk, borderRadius: 10, padding: '4px 8px', fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', lineHeight: 1 }}>NEW</span>
        ) : null}
      </div>
      <div style={{ width: 112, flex: 'none', fontSize: 17, fontWeight: 700, whiteSpace: 'nowrap' }}>{`${fmtDist(r.m / 10, u)} ${dirText(r.b)}`}</div>
      <div style={{ width: 86, flex: 'none', fontSize: 17, fontWeight: 600, color: pal.soft, whiteSpace: 'nowrap' }}>{when(s, r.f)}</div>
      <div style={{ width: 40, flex: 'none', textAlign: 'right', fontSize: 20, fontWeight: 800 }}>{`×${r.n}`}</div>
    </div>
  );
}

function TypeRow({ t, s, pal }: { t: { code: string; name: string; count: number; last: number }; s: RepoState; pal: Pal }) {
  return (
    <div
      style={{
        height: 48,
        flex: 'none',
        background: pal.bg,
        borderRadius: 22,
        padding: '0 18px',
        color: pal.ink,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
      <div style={{ width: 134, flex: 'none', fontSize: 24, fontWeight: 800, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.code}</div>
      <div style={{ flex: 1, minWidth: 0, fontSize: 17, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name === t.code ? '' : t.name}</div>
      <div style={{ width: 112, flex: 'none', fontSize: 17, fontWeight: 600, color: pal.soft, whiteSpace: 'nowrap' }}>{when(s, t.last)}</div>
      <div style={{ width: 60, flex: 'none', textAlign: 'right', fontSize: 22, fontWeight: 800 }}>{t.count.toLocaleString('en-US')}</div>
    </div>
  );
}

// ---- the photos of aircraft seen by eye

function PhotosView({ s, index }: { s: RepoState; index: number }) {
  const { repo } = useApp();
  const n = s.logSeen.length;
  const at = Math.max(0, Math.min(index, n - 1));
  const r = s.logSeen[at] ?? null;
  // undefined while it loads, null when none was saved
  const [photo, setPhoto] = useState<PhotoResult | null | undefined>(undefined);
  const hex = r?.hex ?? null;
  useEffect(() => {
    if (!hex) return;
    let alive = true;
    setPhoto(undefined);
    void repo.savedPhoto(hex).then(p => {
      if (alive) setPhoto(p);
    });
    return () => {
      alive = false;
    };
  }, [hex, repo]);

  if (!r) {
    return (
      <>
        <Header view="photos" />
        <div style={{ fontSize: 20, fontWeight: 600, color: MUTED, padding: '18px 8px' }}>
          Nothing marked yet. Press the Back button on the Overhead screen when you see an aircraft with your own eyes.
        </div>
      </>
    );
  }

  const u = s.settings.units;
  const today = localDayStart(s.nowS, s.offsetS);
  const clockText = clock(r.s!, s.offsetS, s.settings.clock24);
  const seenAt = r.s! >= today ? `Today, ${clockText}` : dateTime(r.s!, s.offsetS, s.settings.clock24);
  const hit = photo?.hit ?? null;
  let label = photo === undefined ? 'Loading the Photo' : 'No Photo Saved';
  if (photo) {
    label =
      photo.kind === 'exact'
        ? 'Photo of This Aircraft'
        : photo.kind === 'fleet'
          ? 'Same Airline and Type, Not This Aircraft'
          : `Typical ${r.d ?? r.t ?? 'Aircraft'}, Not This Aircraft`;
  }
  return (
    <>
      <Header view="photos" />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12 }}>
        <div style={{ width: 440, flex: 'none', background: BLUE.bg, borderRadius: 32, padding: 12, display: 'flex', flexDirection: 'column', gap: 10, color: BLUE.ink }}>
          <div style={{ flex: 1, minHeight: 0, position: 'relative', borderRadius: 22, overflow: 'hidden', background: 'linear-gradient(180deg, #4F8FEA 0%, #8DBBFA 58%, #CFE3FF 100%)' }}>
            {hit ? <img src={hit.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : null}
            <div
              style={{
                position: 'absolute',
                left: 12,
                top: 12,
                background: '#00315E',
                color: '#D6E6FF',
                borderRadius: 14,
                padding: '6px 12px',
                fontSize: 14,
                fontWeight: 700,
                lineHeight: 1,
                maxWidth: 'calc(100% - 24px)',
              }}>
              {label}
            </div>
            {photo?.kind === 'fleet' && photo.shows ? (
              <div style={{ position: 'absolute', left: 12, bottom: 12, background: 'rgba(0,49,94,0.82)', color: '#D6E6FF', borderRadius: 12, padding: '5px 10px', fontSize: 14, fontWeight: 700, lineHeight: 1 }}>
                {`Photo Shows ${photo.shows}`}
              </div>
            ) : null}
          </div>
          <div style={{ flex: 'none', height: 20, display: 'flex', alignItems: 'center', gap: 8, padding: '0 6px 2px', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {hit ? (
              <>
                <CameraGlyph size={18} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{hit.credit.photographer}</span>
                <span style={{ opacity: 0.6 }}>·</span>
                {/* the link is in the page for the credit, but a tap must not send the kiosk away from the app */}
                <a href={hit.credit.link} onClick={e => e.preventDefault()} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {hit.credit.source}
                </a>
              </>
            ) : null}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0, background: '#171717', borderRadius: 32, padding: '16px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.r ?? r.c ?? r.hex.toUpperCase()}</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: MUTED, lineHeight: 1.2 }}>{[r.o, r.d ?? r.t].filter(Boolean).join(' · ')}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Fact label="Seen by Eye" value={seenAt} />
            <Fact label="Closest" value={`${fmtDist(r.m / 10, u)} ${dirText(r.b)}`} />
            <Fact label="Times Seen" value={`×${r.n}`} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Dots n={n} at={at} />
            <span style={{ fontSize: 16, fontWeight: 700, color: MUTED }}>{`${at + 1} of ${n}`}</span>
          </div>
        </div>
      </div>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: MUTED, letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1 }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.05 }}>{value}</span>
    </div>
  );
}

// one dot per photo, up to nine, with the long one for where you are
function Dots({ n, at }: { n: number; at: number }) {
  const max = 9;
  const count = Math.min(n, max);
  const lit = n <= max ? at : Math.min(count - 1, Math.round((at / (n - 1)) * (count - 1)));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} style={{ width: i === lit ? 22 : 8, height: 8, borderRadius: 4, background: i === lit ? '#EAF0FB' : '#5B6472' }} />
      ))}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { dirText, dateTime, clock, localDayStart } from '../../data/format';
import type { RepoState } from '../../data/repo';
import { fmtDist } from '../../data/units';
import type { LogEntry } from '../../data/types';
import { DownloadGlyph, PlaneGlyph, PlusCircleGlyph, TagGlyph } from '../icons';
import { useApp, useRepo } from '../state';
import { GREEN, LAVENDER, MUTED, ROW_PALS, YELLOW, type Pal } from '../theme';

export const LOG_ROWS_SHOWN = 4;

export default function Log() {
  const s = useRepo();
  const { nav } = useApp();
  const [note, setNote] = useState(false);
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(false), 7000);
    return () => clearTimeout(t);
  }, [note]);
  const { total, types, newToday } = s.logStats;
  const first = Math.max(0, Math.min(nav.logIndex, s.logRecent.length - LOG_ROWS_SHOWN));
  const rows = s.logRecent.slice(first, first + LOG_ROWS_SHOWN);
  return (
    <>
      <div style={{ height: 96, flex: 'none', display: 'flex', gap: 12 }}>
        <Stat pal={LAVENDER} label="Aircraft logged" value={total} icon={<PlaneGlyph size={22} color={LAVENDER.accent} />} />
        <Stat pal={GREEN} label="Different types" value={types} icon={<TagGlyph size={22} color={GREEN.accent} />} />
        <Stat pal={YELLOW} label="New today" value={newToday} icon={<PlusCircleGlyph size={22} color={YELLOW.accent} />} />
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ height: 34, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Recent sightings</div>
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
        </div>

        {note ? (
          <div style={{ flex: 'none', background: '#9CC4FF', color: '#00315E', borderRadius: 22, padding: '10px 20px', fontSize: 17, fontWeight: 700, lineHeight: 1.25 }}>
            Export happens on your phone. Open this app&apos;s settings in the Car Thing app, then choose Download CSV.
          </div>
        ) : (
          <div
            style={{
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
            }}>
            <div style={{ width: 112, flex: 'none' }}>Tail number</div>
            <div style={{ flex: 1, minWidth: 0 }}>Type · operator</div>
            <div style={{ width: 118, flex: 'none' }}>Closest</div>
            <div style={{ width: 96, flex: 'none' }}>First seen</div>
            <div style={{ width: 40, flex: 'none', textAlign: 'right' }}>Seen</div>
          </div>
        )}

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.length === 0 ? (
            <div style={{ fontSize: 20, fontWeight: 600, color: MUTED, padding: '18px 8px' }}>
              {`Nothing logged yet. Aircraft are added when they pass within ${s.settings.logMi} miles.`}
            </div>
          ) : null}
          {rows.map((r, i) => (
            <LogRow key={r.hex} r={r} s={s} pal={ROW_PALS[(first + i) % ROW_PALS.length]!} />
          ))}
        </div>
      </div>
    </>
  );
}

function Stat({ pal, label, value, icon }: { pal: Pal; label: string; value: number; icon: React.ReactNode }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: pal.bg,
        borderRadius: 28,
        padding: '10px 18px',
        color: pal.ink,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: pal.soft }}>
        {label}
        {icon}
      </div>
      <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1 }}>{value.toLocaleString('en-US')}</div>
    </div>
  );
}

function LogRow({ r, s, pal }: { r: LogEntry; s: RepoState; pal: Pal }) {
  const u = s.settings.units;
  const today = localDayStart(s.nowS, s.offsetS);
  const isNew = r.f >= today;
  const what = [r.t ?? r.d, r.o].filter(Boolean).join(' · ');
  return (
    <div
      style={{
        height: 50,
        flex: 'none',
        background: pal.bg,
        borderRadius: 22,
        padding: '0 18px',
        color: pal.ink,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
      <div style={{ width: 112, flex: 'none', fontSize: 24, fontWeight: 800, lineHeight: 1, whiteSpace: 'nowrap' }}>{r.r ?? r.c ?? r.hex.toUpperCase()}</div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, fontSize: 17, fontWeight: 700, whiteSpace: 'nowrap' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{what}</span>
        {isNew ? (
          <span style={{ background: pal.chip, color: pal.chipInk, borderRadius: 10, padding: '4px 8px', fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', lineHeight: 1 }}>NEW</span>
        ) : null}
      </div>
      <div style={{ width: 118, flex: 'none', fontSize: 17, fontWeight: 700, whiteSpace: 'nowrap' }}>{`${fmtDist(r.m / 10, u)} ${dirText(r.b)}`}</div>
      <div style={{ width: 96, flex: 'none', fontSize: 17, fontWeight: 600, color: pal.soft, whiteSpace: 'nowrap' }}>
        {isNew ? clock(r.f, s.offsetS, s.settings.clock24) : dateTime(r.f, s.offsetS, s.settings.clock24).split(',')[0]}
      </div>
      <div style={{ width: 40, flex: 'none', textAlign: 'right', fontSize: 20, fontWeight: 800 }}>{`×${r.n}`}</div>
    </div>
  );
}

import type { CSSProperties, ReactNode } from 'react';
import { advance, PROVIDER_NAMES } from '../../data/adsb';
import { dirText } from '../../data/format';
import { EMERGENCY_LABELS, RADAR_RANGES_MI } from '../../data/emergency';
import { offsetMi } from '../../data/geo';
import type { RepoState } from '../../data/repo';
import { distLabel, distValue, fmtAlt, fmtDist, fmtSpeed } from '../../data/units';
import type { Aircraft, Coord, EmergencyInfo, NearAirport } from '../../data/types';
import { Waiting } from '../common';
import { AirportMark, DescendGlyph, ListGlyph, MinusGlyph, PlusGlyph, RadarGlyph, WarnGlyph } from '../icons';
import { KIND_PAL, kindOf, ringNum, shortOperator, type Kind } from '../kinds';
import { hereOf, useApp, useRepo, waitingFor } from '../state';
import { KIND_COLOR, MUTED, PAPER } from '../theme';

const CX = 384;
const CY = 198;
const R = 180;
const GREEN_INK = '#7BE0A0';
const SCOPE_BG = '#07140E';

// how long a position is carried forward along its track before it is drawn as is
const MAX_ADVANCE_S = 20;

interface Dot {
  key: string;
  kind: Kind;
  x: number;
  y: number;
  track: number | null;
  label: string | null;
  distMi: number;
  a: Aircraft | null;
}

const px = (mi: number, range: number) => (mi / range) * R;

function ringSteps(range: number): number[] {
  if (range <= 15) return [range / 3, (range * 2) / 3, range];
  return [range / 4, range / 2, (range * 3) / 4, range];
}

export default function Radar() {
  const s = useRepo();
  const { nav } = useApp();
  const here = hereOf(s);
  const ready = here && (s.aircraft.data || s.aircraft.status === 'ok');
  if (!ready) {
    const w = waitingFor(s);
    return <Waiting title={w.title} detail={w.detail} />;
  }
  const range = nav.rangeMi;
  const dots = buildDots(s, here);
  const inRange = dots.filter(d => d.distMi <= range);
  if (nav.listOpen) return <RadarList s={s} dots={inRange} range={range} index={nav.listIndex} />;
  return <Scope s={s} here={here} range={range} dots={dots} count={inRange.length} />;
}

function buildDots(s: RepoState, here: Coord): Dot[] {
  const out: Dot[] = [];
  const age = Math.min(MAX_ADVANCE_S, Math.max(0, s.nowS - s.aircraftAt));
  const live = (s.aircraft.data ?? []).filter(a => !a.onGround && a.seenPosS <= 60);
  const emerg = new Set(s.emergencies.map(e => e.hex));
  for (const a of live) {
    if (emerg.has(a.hex)) continue;
    const p = advance(a, age + (a.seenPosS > 0 ? Math.min(a.seenPosS, 10) : 0));
    const o = offsetMi(here, p);
    const dist = Math.hypot(o.x, o.y);
    out.push({
      key: a.hex,
      kind: kindOf(a, s),
      x: o.x,
      y: o.y,
      track: a.trackDeg,
      label: a.callsign ?? a.reg,
      distMi: dist,
      a: { ...a, distMi: dist },
    });
  }
  // emergencies are always drawn, even when the nearby search is smaller than the alert radius
  for (const e of s.emergencies) {
    const o = offsetMi(here, e);
    out.push({
      key: e.hex,
      kind: 'emergency',
      x: o.x,
      y: o.y,
      track: null,
      label: `${e.code} ${e.callsign ?? e.reg ?? e.hex.toUpperCase()}`,
      distMi: Math.hypot(o.x, o.y),
      a: null,
    });
  }
  return out.sort((a, b) => a.distMi - b.distMi);
}

// ---- the scope

function Scope({ s, here, range, dots, count }: { s: RepoState; here: Coord; range: number; dots: Dot[]; count: number }) {
  const u = s.settings.units;
  const { repo, nav } = useApp();
  const banner = s.emergencies[0] ?? null;
  const top = banner ? 76 : 0;
  const airport = s.nearAny[s.airportPick] ?? null;
  const nearestAir = dots.find(d => d.kind !== 'emergency' && d.a && d.distMi <= range) ?? null;
  const visible = dots.filter(d => d.distMi <= range);
  // names go on the closest few, and on anything that matters
  const named = new Set(visible.filter(d => d.kind === 'aircraft' || d.kind === 'helicopter').slice(0, 3).map(d => d.key));

  return (
    <div style={{ flex: 1, minHeight: 0, position: 'relative', borderRadius: 32, overflow: 'hidden', background: SCOPE_BG }}>
      <svg viewBox="0 0 768 396" width="100%" height="100%" style={{ display: 'block', position: 'absolute', left: 0, top: 0 }} aria-hidden="true">
        <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke="#123524" strokeWidth="2" />
        <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke="#123524" strokeWidth="2" />
        {ringSteps(range).map((mi, i, all) => (
          <circle
            key={mi}
            cx={CX}
            cy={CY}
            r={px(mi, range)}
            fill="none"
            stroke={i === all.length - 1 ? '#2F7554' : '#1E4A36'}
            strokeWidth={i === all.length - 1 ? 3 : 2}
          />
        ))}
        <g fontSize="14" fontWeight="600" fill="#6FB892" textAnchor="middle">
          {ringSteps(range).map((mi, i, all) => {
            const r = px(mi, range);
            const label = ringNum(distValue(mi, u)) + (i === all.length - 1 ? ` ${distLabel(u)}` : '');
            return (
              <text key={mi} x={CX - r * 0.707} y={CY + r * 0.707 + 4}>
                {label}
              </text>
            );
          })}
        </g>
        <g fontSize="16" fontWeight="800" fill={GREEN_INK} textAnchor="middle">
          <text x={CX} y={banner ? CY - R + 84 : CY - R + 26}>N</text>
          <text x={CX + R - 16} y={CY + 6}>E</text>
          <text x={CX} y={CY + R - 14}>S</text>
          <text x={CX - R + 16} y={CY + 6}>W</text>
        </g>

        {visible.map(d => {
          if (d.kind !== 'emergency') return null;
          const { x, y } = at(d, range);
          return (
            <g key={`halo-${d.key}`}>
              <circle cx={x} cy={y} r="26" fill="#FFB4A2" fillOpacity="0.18" />
              <circle cx={x} cy={y} r="19" fill="none" stroke="#FFB4A2" strokeWidth="3" strokeOpacity="0.85" />
            </g>
          );
        })}

        {nearestAir?.a ? (
          <line
            x1={at(nearestAir, range).x}
            y1={at(nearestAir, range).y}
            x2={CX - 12}
            y2={CY - 2}
            stroke={PAPER}
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeOpacity="0.55"
          />
        ) : null}

        <g stroke={SCOPE_BG} strokeWidth="1.5" strokeLinejoin="round">
          {visible.map(d => {
            const { x, y } = at(d, range);
            return (
              <path
                key={d.key}
                d="M0 -9L6.5 8L0 4.5L-6.5 8Z"
                fill={KIND_COLOR[d.kind === 'watched' ? 'watched' : d.kind]}
                transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${d.track ?? 0})${range >= 50 ? ' scale(0.85)' : ''}`}
              />
            );
          })}
        </g>

        {airport ? <AirportOnScope ap={airport} here={here} range={range} u={u} /> : null}

        {nearestAir ? <circle cx={at(nearestAir, range).x} cy={at(nearestAir, range).y} r="17" fill="none" stroke="#FFFFFF" strokeWidth="2.5" /> : null}

        <circle cx={CX} cy={CY} r="18" fill={GREEN_INK} fillOpacity="0.28" />
        <circle cx={CX} cy={CY} r="7" fill="#FFFFFF" stroke={SCOPE_BG} strokeWidth="2" />

        <g fontSize="15" fontWeight="700" fill={PAPER} stroke={SCOPE_BG} strokeWidth="4" paintOrder="stroke">
          {visible.map(d => {
            if (!d.label) return null;
            if (d.kind !== 'emergency' && d.kind !== 'watched' && !named.has(d.key)) return null;
            const { x, y } = at(d, range);
            return d.kind === 'emergency' ? (
              <text key={`l-${d.key}`} x={x} y={y + 30} fill="#FFB4A2" fontWeight="800" textAnchor="middle">
                {d.label}
              </text>
            ) : (
              <text key={`l-${d.key}`} x={x + 20} y={y - 6} fill={d.kind === 'watched' ? '#FFD966' : PAPER}>
                {d.label}
              </text>
            );
          })}
          <text x={CX - 22} y={CY + 6} textAnchor="end">
            You
          </text>
        </g>
      </svg>

      {banner ? <EmergencyBanner e={banner} u={u} /> : null}

      <Pill style={{ left: 16, top: 16 + top, padding: '8px 16px 8px 12px', borderRadius: 18, gap: 10 }}>
        <RadarGlyph size={26} color={GREEN_INK} />
        <span style={{ fontSize: 22, fontWeight: 700 }}>{`Radar · ${ringNum(distValue(range, u))} ${distLabel(u)}`}</span>
        {!banner ? <span style={{ fontSize: 16, fontWeight: 600, color: MUTED }}>{`${count} aircraft`}</span> : null}
      </Pill>

      {airport ? (
        <Pill
          style={{ left: 16, top: 66 + top, padding: '7px 14px 7px 8px', borderRadius: 16, gap: 8 }}
          onPointerDown={() => repo.cycleAirport()}>
          <AirportMark size={22} />
          <span style={{ fontSize: 20, fontWeight: 800 }}>{airport.code}</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: MUTED }}>{`${fmtDist(airport.distMi, u)} ${dirText(airport.bearingDeg)}`}</span>
        </Pill>
      ) : null}

      <div
        style={{
          position: 'absolute',
          ...(banner ? { left: 0, right: 0, bottom: 4, textAlign: 'center' } : { right: 18, top: 24, textAlign: 'right' }),
          fontSize: 13,
          fontWeight: 600,
          color: '#86A896',
        }}>
        {`Not for navigation or safety · ${s.provider ? PROVIDER_NAMES[s.provider] : 'no data yet'}`}
      </div>

      <ZoomBar range={range} top={banner ? 96 : 90} onPick={mi => nav.setRange(mi)} />

      <div
        style={{
          position: 'absolute',
          left: 16,
          bottom: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 8,
          background: 'rgba(0,0,0,0.55)',
          borderRadius: 18,
          padding: '12px 16px',
          fontSize: 14,
          fontWeight: 600,
          color: PAPER,
        }}>
        <Key color={KIND_COLOR.aircraft}>Aircraft</Key>
        <Key color={KIND_COLOR.helicopter}>Helicopter</Key>
        <Key color={KIND_COLOR.watched}>Watched</Key>
        <Key color={KIND_COLOR.emergency}>Emergency</Key>
        <Key color={PAPER} square>
          Airport
        </Key>
      </div>

      <div
        onPointerDown={() => nav.setListOpen(true)}
        style={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: GREEN_INK,
          color: '#003820',
          borderRadius: 26,
          padding: '14px 22px',
          fontSize: 20,
          fontWeight: 700,
          lineHeight: 1,
        }}>
        <ListGlyph size={24} />
        <span>Click dial for list</span>
      </div>
    </div>
  );
}

function at(d: Dot, range: number): { x: number; y: number } {
  return { x: CX + px(d.x, range), y: CY - px(d.y, range) };
}

function Pill({ children, style, onPointerDown }: { children: ReactNode; style: CSSProperties; onPointerDown?: () => void }) {
  return (
    <div
      onPointerDown={onPointerDown}
      style={{ position: 'absolute', display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.55)', color: PAPER, ...style }}>
      {children}
    </div>
  );
}

function Key({ color, children, square }: { color: string; children: ReactNode; square?: boolean }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: square ? 3 : 5, background: color }} />
      {children}
    </span>
  );
}

function ZoomBar({ range, top, onPick }: { range: number; top: number; onPick: (mi: number) => void }) {
  const at = RADAR_RANGES_MI.indexOf(range as (typeof RADAR_RANGES_MI)[number]);
  const step = (d: number) => onPick(RADAR_RANGES_MI[Math.max(0, Math.min(RADAR_RANGES_MI.length - 1, at + d))]!);
  return (
    <div
      style={{
        position: 'absolute',
        right: 16,
        top,
        width: 56,
        height: 216,
        background: '#171717',
        borderRadius: 28,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 0',
        color: PAPER,
      }}>
      <div onPointerDown={() => step(-1)} style={{ padding: 4 }}>
        <PlusGlyph size={26} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {RADAR_RANGES_MI.map(r => (
          <div
            key={r}
            style={{
              width: r === range ? 26 : 18,
              height: r === range ? 5 : 4,
              borderRadius: r === range ? 3 : 2,
              background: r === range ? GREEN_INK : '#5B6472',
            }}
          />
        ))}
      </div>
      <div onPointerDown={() => step(1)} style={{ padding: 4 }}>
        <MinusGlyph size={26} />
      </div>
    </div>
  );
}

// the airport on the scope: a white square inside the range, or a marker pinned to the rim with an arrow
function AirportOnScope({ ap, here, range, u }: { ap: NearAirport; here: Coord; range: number; u: Parameters<typeof fmtDist>[1] }) {
  const o = offsetMi(here, ap);
  const dist = Math.hypot(o.x, o.y);
  const small = range >= 50;
  if (dist <= range * 0.96) {
    const x = CX + px(o.x, range);
    const y = CY - px(o.y, range);
    const w = small ? 14 : 18;
    return (
      <g>
        <rect x={x - w / 2} y={y - w / 2} width={w} height={w} rx={small ? 4 : 5} fill={PAPER} stroke={SCOPE_BG} strokeWidth="1.5" />
        <rect x={x - 1.5} y={y - w / 2 + 3} width="3" height={w - 6} rx="1.5" fill={SCOPE_BG} />
        <text
          x={x + w / 2 + 6}
          y={y + 6}
          fontSize={small ? 14 : 16}
          fontWeight="800"
          fill={PAPER}
          stroke={SCOPE_BG}
          strokeWidth="4"
          paintOrder="stroke">
          {ap.code}
        </text>
      </g>
    );
  }
  const b = ap.bearingDeg;
  const dx = Math.sin((b * Math.PI) / 180);
  const dy = -Math.cos((b * Math.PI) / 180);
  const ax = CX + dx * R;
  const ay = CY + dy * R;
  const pw = 148;
  const pcx = Math.max(pw / 2 + 8, Math.min(768 - pw / 2 - 8, ax - dx * 84));
  const pcy = Math.max(26, Math.min(370, ay - dy * 6));
  return (
    <g>
      <path
        d="M0 -10L9 8L-9 8Z"
        fill={PAPER}
        stroke={SCOPE_BG}
        strokeWidth="1.5"
        strokeLinejoin="round"
        transform={`translate(${ax.toFixed(1)} ${ay.toFixed(1)}) rotate(${b})`}
      />
      <rect x={pcx - pw / 2} y={pcy - 17} width={pw} height="34" rx="17" fill="#000000" fillOpacity="0.72" />
      <rect x={pcx - pw / 2 + 10} y={pcy - 9} width="18" height="18" rx="5" fill={PAPER} />
      <rect x={pcx - pw / 2 + 17.5} y={pcy - 5.5} width="3" height="11" rx="1.5" fill="#07140E" />
      <text x={pcx - pw / 2 + 36} y={pcy + 5} fontSize="17" fontWeight="800" fill={PAPER}>
        {ap.code}
      </text>
      <text x={pcx - pw / 2 + 36 + ap.code.length * 11 + 8} y={pcy + 5} fontSize="15" fontWeight="600" fill={MUTED}>
        {fmtDist(dist, u)}
      </text>
    </g>
  );
}

function EmergencyBanner({ e, u }: { e: EmergencyInfo; u: Parameters<typeof fmtDist>[1] }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        top: 16,
        height: 64,
        background: '#FFB4A2',
        borderRadius: 26,
        padding: '0 22px',
        color: '#4A1100',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
      <WarnGlyph size={30} color="#4A1100" style={{ flex: 'none' }} />
      <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: '0.01em', lineHeight: 1 }}>EMERGENCY</span>
      <span style={{ fontSize: 19, fontWeight: 700, color: '#6B1D08', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {[e.code, e.callsign ?? e.reg ?? e.hex.toUpperCase(), `${fmtDist(e.distMi, u)} ${dirText(e.bearingDeg)}`, e.altFt === null ? null : fmtAlt(e.altFt, u)]
          .filter(Boolean)
          .join(' · ')}
      </span>
    </div>
  );
}

// ---- the list view

const ROW = 52;
const GAP = 8;
const VISIBLE_ROWS = 6;

function RadarList({ s, dots, range, index }: { s: RepoState; dots: Dot[]; range: number; index: number }) {
  const u = s.settings.units;
  const { nav } = useApp();
  const rows = dots;
  const sel = Math.max(0, Math.min(index, rows.length - 1));
  const first = Math.max(0, Math.min(sel - 2, rows.length - VISIBLE_ROWS));
  const shown = rows.slice(first, first + VISIBLE_ROWS);
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ height: 34, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 700 }}>
            <ListGlyph size={24} color={GREEN_INK} />
            Nearby
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: MUTED }}>{`closest first · within ${ringNum(distValue(range, u))} ${distLabel(u)}`}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: MUTED }}>Turn dial to scroll</div>
          <div
            onPointerDown={() => nav.setListOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 34,
              background: GREEN_INK,
              color: '#003820',
              borderRadius: 17,
              padding: '0 16px',
              fontSize: 16,
              fontWeight: 700,
              lineHeight: 1,
            }}>
            <RadarGlyph size={18} />
            Scope view
          </div>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: GAP, padding: '3px 3px 0' }}>
        {rows.length === 0 ? (
          <div style={{ fontSize: 22, fontWeight: 600, color: MUTED, padding: '24px 8px' }}>{`No aircraft within ${ringNum(distValue(range, u))} ${distLabel(u)}.`}</div>
        ) : null}
        {shown.map((d, i) => (
          <ListRow key={d.key} d={d} s={s} selected={first + i === sel} />
        ))}
      </div>
    </div>
  );
}

function ListRow({ d, s, selected }: { d: Dot; s: RepoState; selected: boolean }) {
  const u = s.settings.units;
  const pal = KIND_PAL[d.kind];
  const [num, unit] = split2(fmtDist(d.distMi, u));
  const a = d.a;
  const bearing = (Math.atan2(d.x, d.y) * 180) / Math.PI;
  const info = s.emergencies.find(e => e.hex === d.key) ?? null;
  const callsign = a?.callsign ?? a?.reg ?? info?.callsign ?? info?.reg ?? d.key.toUpperCase();
  const typ = a?.type ?? info?.type ?? '';
  const op = shortOperator(a?.operator ?? null);
  const sub = [typ, a?.desc && !typ ? a.desc : null, op].filter(Boolean).join(' · ');
  const alt = a?.altFt ?? info?.altFt ?? null;
  const descending = a?.vertFpm !== null && a?.vertFpm !== undefined && a.vertFpm <= -300;
  const badge = d.kind === 'helicopter' ? 'Helicopter' : d.kind === 'watched' ? 'On your list' : d.kind === 'emergency' && info ? `${info.code} ${EMERGENCY_LABELS[info.code]}` : null;
  return (
    <div
      style={{
        height: ROW,
        flex: 'none',
        background: pal.bg,
        borderRadius: 24,
        padding: '0 20px',
        color: pal.ink,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        boxShadow: selected ? '0 0 0 3px #EAF0FB' : undefined,
      }}>
      <div style={{ width: 130, flex: 'none', display: 'flex', alignItems: 'baseline', gap: 5, whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{num}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: pal.soft }}>{`${unit} ${dirText((bearing + 360) % 360)}`}</span>
      </div>
      <div style={{ width: 200, flex: 'none', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, whiteSpace: 'nowrap' }}>{callsign}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: pal.soft, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>
      </div>
      <div style={{ width: 118, flex: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 19, fontWeight: 800, whiteSpace: 'nowrap' }}>
        <span>{fmtAlt(alt, u)}</span>
        {descending ? <DescendGlyph size={16} color={pal.soft} /> : null}
      </div>
      <div style={{ width: 78, flex: 'none', fontSize: 19, fontWeight: 700, whiteSpace: 'nowrap' }}>{a ? fmtSpeed(a.gsKt, u) : ''}</div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end' }}>
        {badge ? (
          <span style={{ background: pal.chip, color: pal.chipInk, borderRadius: 14, padding: '6px 12px', fontSize: 14, fontWeight: 700, lineHeight: 1, whiteSpace: 'nowrap' }}>{badge}</span>
        ) : null}
      </div>
    </div>
  );
}

const split2 = (t: string): [string, string] => {
  const i = t.indexOf(' ');
  return i < 0 ? [t, ''] : [t.slice(0, i), t.slice(i + 1)];
};

// how many aircraft the radar shows at a range, for the dial to know where the list ends
export function rowsInRange(s: RepoState, range: number): number {
  const here = hereOf(s);
  return here ? buildDots(s, here).filter(d => d.distMi <= range).length : 0;
}

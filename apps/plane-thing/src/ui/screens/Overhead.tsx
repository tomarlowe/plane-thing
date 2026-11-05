import type { CSSProperties, ReactNode } from 'react';
import { airlineFromCallsign } from '../../data/airlines';
import { cleanOperator } from '../../data/adsb';
import { dirText } from '../../data/format';
import { OVERHEAD_MI, type RepoState } from '../../data/repo';
import { distLabel, distValue, fmtAlt, fmtDist, fmtSpeed } from '../../data/units';
import type { Aircraft, UnitSystem } from '../../data/types';
import { Chip, Heading, Waiting } from '../common';
import {
  CameraGlyph,
  ClimbGlyph,
  DescendGlyph,
  GaugeGlyph,
  HeadingArrow,
  PinGlyph,
  TargetGlyph,
} from '../icons';
import { dataNote, hereOf, useRepo, waitingFor } from '../state';
import { BLUE, GREEN, LAVENDER, PEACH, SALMON, YELLOW, type Pal } from '../theme';

const split = (text: string): [string, string] => {
  const i = text.indexOf(' ');
  return i < 0 ? [text, ''] : [text.slice(0, i), text.slice(i + 1)];
};

export default function Overhead() {
  const s = useRepo();
  const here = hereOf(s);
  const ready = here && (s.aircraft.data || s.aircraft.status === 'ok');
  return (
    <>
      <Heading icon={<PinGlyph size={22} color="#8AB4F8" />} title="Overhead now" right={dataNote(s)} />
      {!ready ? (
        <WaitingBody s={s} />
      ) : s.overhead && s.overhead.distMi <= OVERHEAD_MI ? (
        <Present s={s} a={s.overhead} />
      ) : (
        <Empty s={s} />
      )}
    </>
  );
}

function WaitingBody({ s }: { s: RepoState }) {
  const w = waitingFor(s);
  return <Waiting title={w.title} detail={w.detail} />;
}

// ---- an aircraft inside the overhead zone

function Present({ s, a }: { s: RepoState; a: Aircraft }) {
  const u = s.settings.units;
  const operator = a.operator ?? cleanOperator(airlineFromCallsign(a.callsign));
  const route = a.callsign ? s.routes[a.callsign] : null;
  const alt = split(fmtAlt(a.altFt, u));
  const spd = split(fmtSpeed(a.gsKt, u));
  const dist = split(fmtDist(a.distMi, u));
  const trend = a.vertFpm !== null && a.vertFpm >= 300 ? 'up' : a.vertFpm !== null && a.vertFpm <= -300 ? 'down' : null;
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12 }}>
      <PhotoCard s={s} a={a} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            flex: 1.3,
            minHeight: 0,
            background: YELLOW.bg,
            borderRadius: 32,
            padding: '14px 22px',
            color: YELLOW.ink,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 18, fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {operator ?? (a.military ? 'Military' : 'Operator unknown')}
            </div>
            <div style={{ background: 'rgba(59,42,0,0.14)', borderRadius: 14, padding: '5px 12px', fontSize: 15, fontWeight: 700, lineHeight: 1 }}>
              {a.reg ?? a.hex.toUpperCase()}
            </div>
          </div>
          <div style={{ fontSize: 58, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
            {a.callsign ?? a.reg ?? a.hex.toUpperCase()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 19, fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.desc ?? a.type ?? 'Unknown type'}
            </div>
            {route ? <Chip pal={YELLOW}>{`${route.from} to ${route.to}, est.`}</Chip> : null}
          </div>
        </div>

        <div
          style={{
            flex: 1.6,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
            gap: 12,
          }}>
          <Stat
            pal={PEACH}
            label="Altitude"
            value={alt[0]}
            unit={alt[1]}
            icon={trend === 'up' ? <ClimbGlyph size={22} color="#B93500" /> : trend === 'down' ? <DescendGlyph size={22} color="#B93500" /> : null}
          />
          <Stat
            pal={LAVENDER}
            label="Speed"
            value={spd[0]}
            unit={spd[1]}
            icon={<GaugeGlyph size={22} color="#5B3FC4" />}
          />
          <Stat
            pal={GREEN}
            label="Heading"
            value={a.trackDeg === null ? '--' : `${String(Math.round(a.trackDeg) % 360).padStart(3, '0')}°`}
            unit={a.trackDeg === null ? '' : dirText(a.trackDeg)}
            icon={a.trackDeg === null ? null : <HeadingArrow deg={a.trackDeg} color="#0B6E4F" />}
          />
          <Stat
            pal={SALMON}
            label="Distance"
            value={dist[0]}
            unit={`${dist[1]} ${dirText(a.bearingDeg)}`}
            icon={<TargetGlyph size={22} color="#8A2A12" />}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ pal, label, value, unit, icon }: { pal: Pal; label: string; value: string; unit: string; icon: ReactNode }) {
  return (
    <div
      style={{
        background: pal.bg,
        borderRadius: 26,
        padding: '10px 16px',
        color: pal.ink,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 0,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: pal.soft, height: 22 }}>
        {label}
        {icon}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: pal.soft }}>{unit}</span>
      </div>
    </div>
  );
}

// ---- the picture

const tag: CSSProperties = {
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
};

function PhotoCard({ s, a }: { s: RepoState; a: Aircraft }) {
  const p = s.photo.hex === a.hex ? s.photo : null;
  const hit = p?.status === 'done' ? p.result.hit : null;
  const kind = p?.status === 'done' ? p.result.kind : 'none';
  let label = 'Looking for a photo';
  if (p?.status === 'done') {
    if (kind === 'exact') label = 'Photo of this aircraft';
    else if (kind === 'fleet') label = 'Same airline and type, not this aircraft';
    else if (kind === 'type') label = `Typical ${a.desc ?? a.type ?? 'aircraft'}, not this aircraft`;
    else label = 'No photo found';
  }
  return (
    <div
      style={{
        width: 384,
        flex: 'none',
        background: BLUE.bg,
        borderRadius: 32,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        color: BLUE.ink,
      }}>
      <div style={{ flex: 1, minHeight: 0, position: 'relative', borderRadius: 22, overflow: 'hidden' }}>
        {hit ? (
          <img src={hit.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <Silhouette />
        )}
        <div style={tag}>{label}</div>
        {kind === 'fleet' && p?.result.shows ? (
          <div
            style={{
              position: 'absolute',
              left: 12,
              bottom: 12,
              background: 'rgba(0,49,94,0.82)',
              color: '#D6E6FF',
              borderRadius: 12,
              padding: '5px 10px',
              fontSize: 14,
              fontWeight: 700,
              lineHeight: 1,
            }}>
            {`Photo shows ${p.result.shows}`}
          </div>
        ) : null}
      </div>
      <div
        style={{
          flex: 'none',
          height: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 6px 2px',
          fontSize: 14,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}>
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
  );
}

// a drawn airliner on a sky, shown while a photo loads or when there is none
function Silhouette() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(180deg, #4F8FEA 0%, #8DBBFA 58%, #CFE3FF 100%)' }}>
      <svg viewBox="0 0 360 284" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }} aria-hidden="true">
        <ellipse cx="70" cy="58" rx="54" ry="14" fill="#FFFFFF" fillOpacity="0.45" />
        <ellipse cx="108" cy="46" rx="34" ry="12" fill="#FFFFFF" fillOpacity="0.45" />
        <ellipse cx="300" cy="244" rx="70" ry="16" fill="#FFFFFF" fillOpacity="0.4" />
        <ellipse cx="40" cy="236" rx="52" ry="12" fill="#FFFFFF" fillOpacity="0.35" />
        <path d="M52 156 L22 176 L54 176 L88 156 Z" fill="#C9D6F0" />
        <path d="M40 134 L26 82 L62 82 L100 134 Z" fill="#E4ECFB" />
        <path d="M33 98 L26 82 L58 82 L49 98 Z" fill="#2F5FB3" />
        <path d="M190 160 L130 206 L168 206 L246 160 Z" fill="#D2DDF4" />
        <rect x="170" y="176" width="58" height="24" rx="12" fill="#B7C5E2" />
        <ellipse cx="224" cy="188" rx="5" ry="10" fill="#7E92B8" />
        <path d="M24 150 C24 136 44 130 74 130 L290 130 C322 130 342 142 352 152 C342 162 322 168 290 168 L74 168 C44 168 24 164 24 150 Z" fill="#F4F7FF" />
        <path d="M34 156 L334 156" stroke="#2F5FB3" strokeWidth="5" strokeLinecap="round" />
        <line x1="96" y1="142" x2="270" y2="142" stroke="#6F89B5" strokeWidth="6" strokeLinecap="round" strokeDasharray="0.01 14" />
        <path d="M312 138 L330 138 Q338 140 344 146 L312 146 Z" fill="#6F89B5" />
      </svg>
    </div>
  );
}

// ---- nothing inside the overhead zone

function Empty({ s }: { s: RepoState }) {
  const u = s.settings.units;
  const nearest = s.overhead ?? null;
  const far = s.far && Number.isFinite(s.far.distMi) ? s.far : null;
  const use = nearest && (!far || nearest.distMi <= far.distMi + 0.5) ? { distMi: nearest.distMi, bearingDeg: nearest.bearingDeg } : far;
  const zone = `${Math.round(distValue(OVERHEAD_MI, u))} ${distLabel(u)}`;
  if (!use) {
    const searching = s.far === null;
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12 }}>
        <div style={{ flex: 1.5, minWidth: 0, background: BLUE.bg, borderRadius: 32, padding: '18px 26px', color: BLUE.ink, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: BLUE.soft }}>{`No aircraft within ${zone}`}</div>
          <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.05 }}>{searching ? 'Looking farther out' : 'Quiet skies'}</div>
          <div style={{ fontSize: 21, fontWeight: 600, color: BLUE.soft }}>
            {searching ? 'Checking a wider area.' : 'Nothing was heard within 100 miles. This screen updates by itself.'}
          </div>
        </div>
        <ScopeCard u={u} outer={30} target={null} />
      </div>
    );
  }
  const [num, unit] = split(fmtDist(use.distMi, u));
  const outer = use.distMi * 1.08 <= 30 ? 30 : use.distMi * 1.08 <= 50 ? 50 : 100;
  const chips: string[] = [];
  if (nearest) {
    if (nearest.callsign ?? nearest.reg) chips.push((nearest.callsign ?? nearest.reg)!);
    if (nearest.type) chips.push(nearest.type);
    if (nearest.altFt !== null) chips.push(fmtAlt(nearest.altFt, u));
    if (nearest.trackDeg !== null) chips.push(`heading ${String(Math.round(nearest.trackDeg) % 360).padStart(3, '0')}°`);
  }
  const miles = use.distMi < 10 ? use.distMi.toFixed(1) : String(Math.round(use.distMi));
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12 }}>
      <div
        style={{
          flex: 1.5,
          minWidth: 0,
          background: BLUE.bg,
          borderRadius: 32,
          padding: '18px 26px',
          color: BLUE.ink,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: BLUE.soft }}>{`No aircraft within ${zone}`}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 104, fontWeight: 800, lineHeight: 0.95, letterSpacing: '-0.02em' }}>{num}</span>
            <span style={{ fontSize: 40, fontWeight: 800 }}>{unit}</span>
            <span style={{ alignSelf: 'center', background: BLUE.chip, color: BLUE.chipInk, borderRadius: 18, padding: '8px 16px', fontSize: 24, fontWeight: 800, lineHeight: 1 }}>
              {dirText(use.bearingDeg)}
            </span>
          </div>
          <div style={{ fontSize: 21, fontWeight: 600, color: BLUE.soft }}>
            {u === 'imperial' ? `The nearest aircraft is ${miles} miles away.` : `The nearest aircraft is ${num} ${unit} away.`}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {chips.map(c => (
            <div key={c} style={{ background: BLUE.chip, color: BLUE.chipInk, borderRadius: 16, padding: '7px 14px', fontSize: 16, fontWeight: 700, lineHeight: 1.1 }}>
              {c}
            </div>
          ))}
        </div>
      </div>
      <ScopeCard u={u} outer={outer} target={{ distMi: use.distMi, bearingDeg: use.bearingDeg, trackDeg: nearest?.trackDeg ?? null }} />
    </div>
  );
}

function ScopeCard({
  u,
  outer,
  target,
}: {
  u: UnitSystem;
  outer: number;
  target: { distMi: number; bearingDeg: number; trackDeg: number | null } | null;
}) {
  const cx = 153;
  const cy = 170;
  const R = 120;
  const zoneR = (OVERHEAD_MI / outer) * R;
  const label = (mi: number) => `${Math.round(distValue(mi, u))} ${distLabel(u)}`;
  let plane: ReactNode = null;
  if (target) {
    const r = Math.min(R + 10, (target.distMi / outer) * R);
    const b = (target.bearingDeg * Math.PI) / 180;
    const x = cx + Math.sin(b) * r;
    const y = cy - Math.cos(b) * r;
    plane = (
      <path
        d="M0 -10L7.5 9L0 5L-7.5 9Z"
        fill="#2A1A63"
        stroke="#CBB8FF"
        strokeWidth="2"
        strokeLinejoin="round"
        transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${target.trackDeg ?? 0})`}
      />
    );
  }
  return (
    <div style={{ flex: 1, minWidth: 0, position: 'relative', borderRadius: 32, overflow: 'hidden', background: LAVENDER.bg }}>
      <svg viewBox="0 0 306 358" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }} aria-hidden="true">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#2A1A63" strokeOpacity="0.35" strokeWidth="2" />
        <circle cx={cx} cy={cy} r={(R * 2) / 3} fill="none" stroke="#2A1A63" strokeOpacity="0.35" strokeWidth="2" />
        <circle cx={cx} cy={cy} r={zoneR} fill="#2A1A63" fillOpacity="0.14" stroke="#2A1A63" strokeWidth="3" strokeDasharray="7 6" />
        <g fontSize="14" fontWeight="700" fill="#4B2FA8" textAnchor="middle">
          <text x={cx} y={cy - zoneR - 8}>{label(OVERHEAD_MI)}</text>
          <text x={cx} y={cy - R - 8}>{label(outer)}</text>
        </g>
        {plane}
        <circle cx={cx} cy={cy} r="8" fill="#2A1A63" />
        <circle cx={cx} cy={cy} r="3" fill="#CBB8FF" />
        <text x={cx} y="342" fontSize="16" fontWeight="700" fill="#2A1A63" textAnchor="middle">
          Dashed ring: overhead zone
        </text>
      </svg>
    </div>
  );
}


import type { Arrival } from '../../data/arrivals';
import { STATUS_LABEL } from '../../data/arrivals';
import { airlineFromCallsign } from '../../data/airlines';
import { cleanOperator } from '../../data/adsb';
import { faaLine } from '../../data/faa';
import type { RepoState } from '../../data/repo';
import { fmtAlt, fmtDist } from '../../data/units';
import { Waiting } from '../common';
import { ArrivalGlyph, WarnGlyph } from '../icons';
import { minutesText, shortOperator } from '../kinds';
import { hereOf, useApp, useRepo, waitingFor } from '../state';
import { MUTED, ROW_PALS, SALMON, type Pal } from '../theme';

export default function Arrivals() {
  const s = useRepo();
  const { repo } = useApp();
  const ap = s.nearBig[s.arrivalsPick] ?? null;
  if (!hereOf(s) || !s.airportsReady) {
    const w = waitingFor(s);
    return <Waiting title={s.airportsReady || !hereOf(s) ? w.title : 'Loading Airports'} detail={s.airportsReady ? w.detail : s.airportLabel || null} />;
  }
  if (!ap) return <Waiting title="No Airport Nearby" detail="No large or medium airport was found in the airports you chose." />;
  const u = s.settings.units;
  const rows = s.arrivals.data;
  return (
    <>
      <div style={{ height: 34, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 24, fontWeight: 700 }}>
          <ArrivalGlyph size={24} color="#FFD966" />
          {`Arriving at ${ap.code}`}
          <span
            onPointerDown={() => repo.cycleArrivalsAirport()}
            style={{ background: '#171717', color: MUTED, borderRadius: 14, padding: '6px 12px', fontSize: 14, fontWeight: 600, lineHeight: 1 }}>
            {s.arrivalsPick === 0 ? 'Nearest Airport' : `${ap.name}`}
            {s.nearBig.length > 1 ? ' · Turn Dial to Change' : ''}
          </span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: MUTED }}>{`${fmtDist(ap.distMi, u)} Away`}</div>
      </div>

      {s.faa ? (
        <div
          style={{
            height: 64,
            flex: 'none',
            background: SALMON.bg,
            borderRadius: 26,
            padding: '0 20px',
            color: SALMON.ink,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}>
          <WarnGlyph size={30} color={SALMON.accent} style={{ flex: 'none' }} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.1 }}>{`FAA: ${s.faa.kind} at ${ap.code}`}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: SALMON.soft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{faaLine(s.faa)}</div>
          </div>
          <div style={{ background: SALMON.chip, color: SALMON.chipInk, borderRadius: 14, padding: '6px 12px', fontSize: 14, fontWeight: 700, lineHeight: 1 }}>FAA Live</div>
        </div>
      ) : null}

      <div
        style={{
          height: 16,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '0 22px',
          marginTop: 2,
          fontSize: 13,
          fontWeight: 700,
          color: MUTED,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
        <div style={{ width: 92, flex: 'none' }}>Estimated</div>
        <div style={{ width: 150, flex: 'none' }}>Flight</div>
        <div style={{ flex: 1, minWidth: 0 }}>Coming From</div>
        <div style={{ width: 120, flex: 'none' }}>Distance</div>
        <div style={{ width: 128, flex: 'none' }}>Status</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 'none' }}>
        {!rows ? (
          <div style={{ fontSize: 20, fontWeight: 600, color: MUTED, padding: '14px 8px' }}>
            {s.arrivals.status === 'error' ? `Cannot get arrivals. ${s.arrivals.error}` : 'Looking for Arriving Aircraft'}
          </div>
        ) : rows.length === 0 ? (
          <div style={{ fontSize: 20, fontWeight: 600, color: MUTED, padding: '14px 8px' }}>{`Nothing is arriving at ${ap.code} right now.`}</div>
        ) : (
          rows.slice(0, s.faa ? 4 : 5).map((r, i) => <Row key={r.hex} r={r} s={s} pal={ROW_PALS[i % ROW_PALS.length]!} />)
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'flex-end', padding: '0 4px', fontSize: 13, fontWeight: 600, color: MUTED }}>
        Times and origins are estimates from position and speed.
      </div>
    </>
  );
}

function Row({ r, s, pal }: { r: Arrival; s: RepoState; pal: Pal }) {
  const u = s.settings.units;
  const route = r.callsign ? s.routes[r.callsign] : null;
  const op = shortOperator(cleanOperator(airlineFromCallsign(r.callsign)));
  const sub = [r.type, op].filter(Boolean).join(' · ');
  return (
    <div
      style={{
        height: 52,
        flex: 'none',
        background: pal.bg,
        borderRadius: 22,
        padding: '0 18px',
        color: pal.ink,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
      <div style={{ width: 92, flex: 'none', fontSize: 28, fontWeight: 800, lineHeight: 1, whiteSpace: 'nowrap' }}>{minutesText(r.etaS - s.nowS)}</div>
      <div style={{ width: 150, flex: 'none', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, whiteSpace: 'nowrap' }}>{r.callsign ?? r.reg ?? r.hex.toUpperCase()}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: pal.soft, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0, fontSize: 17, fontWeight: 700, whiteSpace: 'nowrap' }}>{route ? `${route.from}, est.` : 'Origin Unknown'}</div>
      <div style={{ width: 120, flex: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{fmtDist(r.distMi, u)}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: pal.soft, lineHeight: 1.1 }}>{fmtAlt(r.altFt, u)}</span>
      </div>
      <div
        style={{
          width: 128,
          flex: 'none',
          background: pal.chip,
          color: pal.chipInk,
          borderRadius: 16,
          padding: '7px 0',
          textAlign: 'center',
          fontSize: 14,
          fontWeight: 700,
          lineHeight: 1,
        }}>
        {STATUS_LABEL[r.status]}
      </div>
    </div>
  );
}

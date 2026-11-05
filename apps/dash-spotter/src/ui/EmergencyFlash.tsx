import { useEffect, useRef, useState } from 'react';
import { dirText } from '../data/format';
import type { AlertState } from '../data/repo';
import type { UnitSystem } from '../data/types';
import { fmtAlt, fmtDist } from '../data/units';
import { WarnGlyph } from './icons';

// three flashes, each one second: half a second of salmon, half a second of black. that is one flash a second, well under
// the three a second that can trouble people who are sensitive to flashing
export const PHASE_MS = 500;
export const PHASES = 6;

const SALMON = '#FFB4A2';
const INK = '#4A1100';

export default function EmergencyFlash({ alert, units, onDone }: { alert: AlertState; units: UnitSystem; onDone: () => void }) {
  const [phase, setPhase] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  // the simulator can hold the first phase still for a screenshot
  const hold = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('holdflash');

  useEffect(() => {
    if (hold) return;
    setPhase(0);
    let n = 0;
    const t = setInterval(() => {
      n++;
      if (n >= PHASES) {
        clearInterval(t);
        done.current();
      } else {
        setPhase(n);
      }
    }, PHASE_MS);
    return () => clearInterval(t);
  }, [alert.n, hold]);

  const e = alert.info;
  const lit = phase % 2 === 0;
  const fg = lit ? INK : SALMON;
  return (
    <div
      role="alert"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 100,
        background: lit ? SALMON : '#000000',
        color: fg,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        textAlign: 'center',
      }}>
      <WarnGlyph size={72} color={fg} />
      <div style={{ fontSize: 108, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>EMERGENCY</div>
      <div
        style={{
          background: lit ? INK : SALMON,
          color: lit ? '#FFD9D0' : INK,
          borderRadius: 32,
          padding: '10px 28px',
          fontSize: 34,
          fontWeight: 800,
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
        }}>
        {`${e.code} · ${e.label}`}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1, whiteSpace: 'nowrap' }}>
          {[e.callsign ?? e.reg ?? e.hex.toUpperCase(), e.desc ?? e.type].filter(Boolean).join(' · ')}
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1, color: lit ? '#6B1D08' : SALMON, whiteSpace: 'nowrap' }}>
          {`${fmtDist(e.distMi, units)} ${dirText(e.bearingDeg)} · ${fmtAlt(e.altFt, units)}`}
        </div>
      </div>
    </div>
  );
}

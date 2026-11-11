import type { CSSProperties, ReactNode } from 'react';
import { ArrivalGlyph, BookGlyph, EyeGlyph, PlaneGlyph, RadarGlyph } from './icons';
import { MUTED, SCREENS, type Pal, type ScreenId } from './theme';

const GLYPHS: Record<ScreenId, (p: { size?: number }) => ReactNode> = {
  overhead: PlaneGlyph,
  radar: RadarGlyph,
  watchlist: EyeGlyph,
  log: BookGlyph,
  arrivals: ArrivalGlyph,
};

export function TopStrip({ active, onPick }: { active: ScreenId; onPick: (id: ScreenId) => void }) {
  return (
    <nav aria-label="Screens" style={{ display: 'flex', gap: 8, height: 44, flex: 'none' }}>
      {SCREENS.map(s => {
        const Glyph = GLYPHS[s.id];
        const on = s.id === active;
        const style: CSSProperties = {
          flex: s.weight,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          height: 44,
          borderRadius: 22,
          background: on ? s.bg : '#171717',
          color: on ? s.fg : '#EAF0FB',
          fontSize: 18,
          fontWeight: 600,
          lineHeight: 1,
        };
        return (
          <div key={s.id} style={style} onPointerDown={() => onPick(s.id)}>
            <Glyph size={22} />
            <span>{s.label}</span>
          </div>
        );
      })}
    </nav>
  );
}

// the black page with the five screen buttons across the top
export function Frame({
  active,
  onPick,
  gap = 12,
  strip,
  children,
}: {
  active: ScreenId;
  onPick: (id: ScreenId) => void;
  gap?: number;
  strip?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="screen" style={{ padding: '12px 16px 16px', gap: 12 }}>
      <TopStrip active={active} onPick={onPick} />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap, overflow: 'hidden' }}>{children}</div>
      {strip}
    </div>
  );
}

export function Heading({ icon, title, right, chip }: { icon: ReactNode; title: ReactNode; right?: ReactNode; chip?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 26, flex: 'none', padding: '0 4px', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 22, fontWeight: 700, color: '#EAF0FB', minWidth: 0 }}>
          {icon}
          {title}
        </div>
        {chip}
      </div>
      {right ? <div style={{ fontSize: 15, fontWeight: 600, color: MUTED, whiteSpace: 'nowrap' }}>{right}</div> : null}
    </div>
  );
}

export function Chip({ pal, children, style }: { pal: Pal; children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: pal.chip,
        color: pal.chipInk,
        borderRadius: 14,
        padding: '6px 12px',
        fontSize: 14,
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        ...style,
      }}>
      {children}
    </div>
  );
}

// shown when there is nothing to draw yet
export function Waiting({ title, detail }: { title: string; detail?: string | null }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 620, padding: '28px 40px', borderRadius: 44, background: '#9CC4FF', color: '#00315E', textAlign: 'center' }}>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.5 }}>{title}</div>
        {detail ? <div style={{ marginTop: 8, fontSize: 21, fontWeight: 600, color: '#0A4688' }}>{detail}</div> : null}
      </div>
    </div>
  );
}

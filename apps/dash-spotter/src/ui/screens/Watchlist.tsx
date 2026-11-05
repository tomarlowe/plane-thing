import type { ReactNode } from 'react';
import { dirText } from '../../data/format';
import { EMERGENCY_LABELS } from '../../data/emergency';
import { nearestHelicopter, nearestWatched } from '../../data/watch';
import type { RepoState } from '../../data/repo';
import { fmtAlt, fmtDist } from '../../data/units';
import { EyeGlyph, HeliGlyph, StarGlyph, WarnGlyph } from '../icons';
import { hereOf, useRepo } from '../state';
import { LAVENDER, MUTED, PEACH, SALMON, YELLOW, type Pal } from '../theme';

export default function Watchlist() {
  const s = useRepo();
  const u = s.settings.units;
  const e = s.emergencies[0] ?? null;
  const live = (s.aircraft.data ?? []).filter(a => !a.onGround && a.seenPosS <= 60);
  const heli = nearestHelicopter(live);
  const watched = nearestWatched(live, s.settings.watch);
  const describe = (a: NonNullable<typeof heli>) => [a.desc ?? a.type, `${fmtDist(a.distMi, u)} ${dirText(a.bearingDeg)}`, fmtAlt(a.altFt, u)].filter(Boolean).join(' · ');
  const searching = !hereOf(s);
  return (
    <>
      {e ? (
        <div
          style={{
            height: 116,
            flex: 'none',
            background: SALMON.bg,
            borderRadius: 32,
            padding: '12px 26px',
            color: SALMON.ink,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 700, color: SALMON.soft }}>
              <WarnGlyph size={22} color={SALMON.accent} />
              Emergency squawk
            </div>
            <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.01em' }}>{e.code}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, whiteSpace: 'nowrap' }}>{e.callsign ?? e.reg ?? e.hex.toUpperCase()}</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: SALMON.soft, whiteSpace: 'nowrap' }}>{e.desc ?? e.type ?? 'Unknown type'}</div>
            <div style={{ alignSelf: 'flex-start', background: SALMON.chip, color: SALMON.chipInk, borderRadius: 14, padding: '5px 12px', fontSize: 14, fontWeight: 700, lineHeight: 1 }}>
              {EMERGENCY_LABELS[e.code]}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: 44, fontWeight: 800, lineHeight: 1 }}>{fmtDist(e.distMi, u).split(' ')[0]}</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: SALMON.soft }}>{`${fmtDist(e.distMi, u).split(' ')[1]} ${dirText(e.bearingDeg)}`}</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: SALMON.soft }}>{fmtAlt(e.altFt, u)}</div>
          </div>
        </div>
      ) : (
        <Quiet
          height={116}
          radius={32}
          icon={<WarnGlyph size={26} color={MUTED} />}
          title="No emergency squawks"
          detail="Watching codes 7500, 7600 and 7700 within 100 miles."
        />
      )}

      <div style={{ height: 124, flex: 'none', display: 'flex', gap: 12 }}>
        {heli ? (
          <Card pal={PEACH} icon={<HeliGlyph size={22} color={PEACH.accent} />} label="Helicopter" big={heli.callsign ?? heli.reg ?? heli.hex.toUpperCase()} line={describe(heli)} />
        ) : (
          <Quiet fill radius={32} icon={<HeliGlyph size={24} color={MUTED} />} title="No helicopters" detail={searching ? 'Waiting for your location.' : 'None heard nearby.'} />
        )}
        {watched ? (
          <Card
            pal={YELLOW}
            icon={<StarGlyph size={22} />}
            label="On your list"
            big={watched.a.callsign ?? watched.a.reg ?? watched.a.hex.toUpperCase()}
            line={describe(watched.a)}
          />
        ) : (
          <Quiet
            fill
            radius={32}
            icon={<StarGlyph size={24} color="#7A6B2E" />}
            title="Nothing on your list"
            detail={s.settings.watch.length ? 'None of them are nearby.' : 'Add names in settings on your phone.'}
          />
        )}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          background: LAVENDER.bg,
          borderRadius: 32,
          padding: '12px 22px',
          color: LAVENDER.ink,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 20, fontWeight: 700 }}>
            <EyeGlyph size={24} color={LAVENDER.accent} />
            Watching for
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: LAVENDER.soft }}>Edit on your phone</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {watchingChips(s).map(c => (
            <div key={c} style={{ background: 'rgba(42,26,99,0.16)', borderRadius: 16, padding: '7px 14px', fontSize: 16, fontWeight: 700, lineHeight: 1.1 }}>
              {c}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// the fixed things, then what the user added
export function watchingChips(s: RepoState): string[] {
  const out = ['7500 hijack', '7600 radio failure', '7700 emergency', 'Helicopters'];
  const tokens = s.settings.watch;
  if (tokens.includes('MIL')) out.push('Military');
  const own = tokens.filter(t => t !== 'MIL');
  if (own.length > 0 && own.length <= 3) out.push(...own);
  else if (own.length > 3) out.push(`${own.length} on your list`);
  return out;
}

function Card({ pal, icon, label, big, line }: { pal: Pal; icon: ReactNode; label: string; big: string; line: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: pal.bg,
        borderRadius: 32,
        padding: '12px 22px',
        color: pal.ink,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 700, color: pal.soft }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, whiteSpace: 'nowrap' }}>{big}</div>
      <div style={{ fontSize: 17, fontWeight: 600, color: pal.soft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{line}</div>
    </div>
  );
}

// the card for something that is not there right now
function Quiet({ height, radius, icon, title, detail, fill }: { height?: number; radius: number; icon: ReactNode; title: string; detail: string; fill?: boolean }) {
  return (
    <div
      style={{
        ...(fill ? { flex: 1 } : { height, flex: 'none' }),
        minWidth: 0,
        background: '#171717',
        borderRadius: radius,
        padding: '12px 26px',
        color: '#EAF0FB',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
      {icon}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: MUTED }}>{detail}</div>
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';
import { clock } from '../data/format';
import { OVERHEAD_MI } from '../data/repo';
import { distLabel, distValue } from '../data/units';
import { EyeGlyph } from './icons';
import { useRepo, type Banner } from './state';

interface Look {
  bg: string;
  ink: string;
  soft: string;
  icon: ReactNode;
  title: string;
  detail: string;
}

// the message that drops over the top of the Overhead screen after the Back button
export default function SeenBanner({ banner }: { banner: Banner }) {
  const s = useRepo();
  const when = clock(banner.at, s.offsetS, s.settings.clock24);
  const u = s.settings.units;
  const look: Look =
    banner.kind === 'new'
      ? { bg: '#7BE0A0', ink: '#003820', soft: '#0B5A36', icon: <EyeGlyph size={26} color="#003820" style={{ flex: 'none' }} />, title: 'Seen by Eye', detail: `${banner.tail} · ${when}` }
      : banner.kind === 'again'
        ? { bg: '#CBB8FF', ink: '#2A1A63', soft: '#4B2FA8', icon: <EyeGlyph size={26} color="#2A1A63" style={{ flex: 'none' }} />, title: 'Already Marked', detail: `${banner.tail} · First Marked at ${when}` }
        : {
            bg: '#D9E2F2',
            ink: '#1B2433',
            soft: '#3A4A66',
            icon: (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1B2433" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}>
                <circle cx="12" cy="12" r="9" />
                <path d="M8 12h8" />
              </svg>
            ),
            title: 'Nothing Overhead to Mark',
            detail: banner.why === 'lost' ? 'Aircraft Out of Range' : `No Aircraft Within ${Math.round(distValue(OVERHEAD_MI, u))} ${distLabel(u)}`,
          };
  return (
    <div
      role="status"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        top: 64,
        height: 46,
        zIndex: 50,
        background: look.bg,
        color: look.ink,
        borderRadius: 23,
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 6px 22px rgba(0,0,0,0.65)',
      }}>
      {look.icon}
      <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, whiteSpace: 'nowrap' }}>{look.title}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: look.soft, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{look.detail}</span>
    </div>
  );
}

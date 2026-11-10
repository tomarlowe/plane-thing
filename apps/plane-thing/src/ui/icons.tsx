import type { CSSProperties } from 'react';

interface P {
  size?: number;
  color?: string;
  style?: CSSProperties;
}

const stroke = ({ size = 22, color = 'currentColor', style }: P, sw = 2.2) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: color,
  strokeWidth: sw,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  style,
});

export const PlaneGlyph = ({ size = 22, color = 'currentColor', style }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" style={style}>
    <path d="M12 2c.9 0 1.6 1 1.6 2.6V9l7.4 4.6v2.2l-7.4-2.3v4.5l2.2 1.7V22L12 21l-3.8 1v-1.5l2.2-1.7v-4.5L3 15.8v-2.2L10.4 9V4.6C10.4 3 11.1 2 12 2z" />
  </svg>
);

export const RadarGlyph = (p: P) => (
  <svg {...stroke(p)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 12l6-6" />
  </svg>
);

export const EyeGlyph = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const BookGlyph = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M5 3h11a3 3 0 0 1 3 3v15H8a3 3 0 0 1-3-3V3z" />
    <path d="M9 8h6M9 12h4" />
  </svg>
);

export const ArrivalGlyph = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M12 3v11M7 10l5 5 5-5M4 21h16" />
  </svg>
);

export const PinGlyph = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

export const CameraGlyph = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

export const WarnGlyph = (p: P) => (
  <svg {...stroke(p, 2.4)}>
    <path d="M12 3L2 20h20L12 3z" />
    <path d="M12 10v5M12 17.5v.01" />
  </svg>
);

export const ListGlyph = (p: P) => (
  <svg {...stroke(p, p.size && p.size < 20 ? 2.6 : 2.4)}>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
  </svg>
);

export const DownloadGlyph = (p: P) => (
  <svg {...stroke(p, 2.6)}>
    <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
  </svg>
);

export const DescendGlyph = (p: P) => (
  <svg {...stroke(p, 2.6)}>
    <path d="M7 7l10 10M17 9v8H9" />
  </svg>
);

export const ClimbGlyph = (p: P) => (
  <svg {...stroke(p, 2.6)}>
    <path d="M7 17l10-10M17 15V7H9" />
  </svg>
);

export const GaugeGlyph = (p: P) => (
  <svg {...stroke(p, 2.4)}>
    <path d="M4 17a8 8 0 1 1 16 0" />
    <path d="M12 17l4-5" />
  </svg>
);

export const TargetGlyph = (p: P) => (
  <svg {...stroke(p, 2.4)}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
);

export const TagGlyph = (p: P) => (
  <svg {...stroke(p, 2.4)}>
    <path d="M3 12l9-9h9v9l-9 9z" />
    <path d="M16 8h.01" />
  </svg>
);

export const PlusCircleGlyph = (p: P) => (
  <svg {...stroke(p, 2.6)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

export const HeliGlyph = (p: P) => (
  <svg {...stroke(p, 2.4)}>
    <path d="M3 5h18M12 5v3" />
    <ellipse cx="11" cy="13" rx="6" ry="4" />
    <path d="M17 13h5M22 10.5v5" />
    <path d="M7 19h9" />
  </svg>
);

export const StarGlyph = ({ size = 22, color = '#D9480F' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" />
  </svg>
);

export const PlusGlyph = (p: P) => (
  <svg {...stroke(p, 3)}>
    <path d="M12 4v16M4 12h16" />
  </svg>
);

export const MinusGlyph = (p: P) => (
  <svg {...stroke(p, 3)}>
    <path d="M4 12h16" />
  </svg>
);

// a target with ticks, for an aircraft picked on the radar
export const PickGlyph = (p: P) => (
  <svg {...stroke(p)}>
    <circle cx="12" cy="12" r="7.5" />
    <circle cx="12" cy="12" r="2.2" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
  </svg>
);

export const OpenGlyph = (p: P) => (
  <svg {...stroke(p, 3)}>
    <path d="M7 17L17 7M9 7h8v8" />
  </svg>
);

// the arrow that shows a heading. points up at 0 degrees
export const HeadingArrow = ({ deg, size = 22, color }: { deg: number; size?: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" style={{ transform: `rotate(${deg}deg)` }}>
    <path d="M12 2l6 11h-4.5v9h-3v-9H6z" />
  </svg>
);

// the white rounded square with a runway bar, used for airports on the scope and in chips
export const AirportMark = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
    <rect x="2" y="2" width="18" height="18" rx="5" fill="#EAF0FB" />
    <rect x="9.5" y="5.5" width="3" height="11" rx="1.5" fill="#07140E" />
  </svg>
);

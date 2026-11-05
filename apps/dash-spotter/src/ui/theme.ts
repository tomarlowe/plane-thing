// colors from the approved mockups. every card is a pastel container with dark ink on a black screen

export interface Pal {
  bg: string;
  ink: string;
  // secondary labels on the card
  soft: string;
  // small dark chips on the card, and their text
  chip: string;
  chipInk: string;
  // icon strokes
  accent: string;
}

export const BLUE: Pal = { bg: '#9CC4FF', ink: '#00315E', soft: '#0A4688', chip: '#00315E', chipInk: '#D6E6FF', accent: '#1E4FB8' };
export const YELLOW: Pal = { bg: '#FFD966', ink: '#3B2A00', soft: '#6B4E00', chip: '#3B2A00', chipInk: '#FFE9A8', accent: '#D9480F' };
export const PEACH: Pal = { bg: '#FFC48A', ink: '#4A2400', soft: '#7A3E00', chip: '#4A2400', chipInk: '#FFE0C2', accent: '#B93500' };
export const LAVENDER: Pal = { bg: '#CBB8FF', ink: '#2A1A63', soft: '#4B2FA8', chip: '#2A1A63', chipInk: '#E6DCFF', accent: '#5B3FC4' };
export const GREEN: Pal = { bg: '#A8E6CF', ink: '#00382A', soft: '#075240', chip: '#00382A', chipInk: '#CFF5E6', accent: '#0B6E4F' };
export const SALMON: Pal = { bg: '#FFB4A2', ink: '#4A1100', soft: '#6B1D08', chip: '#4A1100', chipInk: '#FFD9D0', accent: '#8A2A12' };

// list rows on the radar list, the log and arrivals alternate so neighbours differ
export const ROW_PALS: Pal[] = [BLUE, GREEN, PEACH, LAVENDER, YELLOW];

export type ScreenId = 'overhead' | 'radar' | 'watchlist' | 'log' | 'arrivals';

export const SCREENS: Array<{ id: ScreenId; label: string; bg: string; fg: string; key: string }> = [
  { id: 'overhead', label: 'Overhead', bg: '#8AB4F8', fg: '#0A2A5E', key: '1' },
  { id: 'radar', label: 'Radar', bg: '#7BE0A0', fg: '#003820', key: '2' },
  { id: 'watchlist', label: 'Watchlist', bg: '#FFC48A', fg: '#4A2400', key: '3' },
  { id: 'log', label: 'Log', bg: '#CBB8FF', fg: '#2A1A63', key: '4' },
  { id: 'arrivals', label: 'Arrivals', bg: '#FFD966', fg: '#3B2A00', key: 'm' },
];

export const MUTED = '#A9B7D0';
export const PAPER = '#EAF0FB';

// aircraft colors on the scope and in lists
export const KIND_COLOR = {
  aircraft: '#9CC4FF',
  helicopter: '#FFC48A',
  watched: '#FFD966',
  emergency: '#FFB4A2',
} as const;

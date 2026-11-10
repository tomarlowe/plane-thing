import type { ScreenId } from './ui/theme';

// preset buttons 1 to 4 and the recessed mode button ("m") pick the screen. the dial is read as a wheel and its click
// is Enter. the back button is Escape and marks an aircraft as visually verified on the Overhead screen
const KEY_TO_SCREEN: Record<string, ScreenId> = {
  '1': 'overhead',
  '2': 'radar',
  '3': 'watchlist',
  '4': 'log',
  m: 'arrivals',
};

export interface InputHandlers {
  onScreen: (id: ScreenId) => void;
  onDial: (step: 1 | -1) => void;
  onClick: () => void;
  onBack: () => void;
  // any key, wheel turn or touch. returns true when it was used up cutting the emergency flash short
  onAny: () => boolean;
}

// one detent can arrive as a burst of wheel events, so only one step is taken per short window
const DIAL_WINDOW_MS = 120;

export function attachInput(h: InputHandlers, reversed: () => boolean): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (h.onAny()) return;
    if (e.key === 'Enter') return h.onClick();
    if (e.key === 'Escape') return e.repeat ? undefined : h.onBack();
    const id = KEY_TO_SCREEN[e.key.toLowerCase()];
    if (id) h.onScreen(id);
  };

  let last = -Infinity;
  const onWheel = (e: WheelEvent) => {
    if (e.deltaX === 0) return;
    if (h.onAny()) return;
    if (e.timeStamp - last < DIAL_WINDOW_MS) return;
    last = e.timeStamp;
    const dir = e.deltaX > 0 ? 1 : -1;
    h.onDial(reversed() ? (-dir as 1 | -1) : dir);
  };

  const onPointer = () => void h.onAny();

  window.addEventListener('keydown', onKey);
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('pointerdown', onPointer);
  return () => {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('pointerdown', onPointer);
  };
}

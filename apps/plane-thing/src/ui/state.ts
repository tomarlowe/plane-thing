import { createContext, useContext, useSyncExternalStore } from 'react';
import { PROVIDER_NAMES } from '../data/adsb';
import { ago, clock } from '../data/format';
import type { Repo, RepoState } from '../data/repo';
import type { Coord } from '../data/types';
import type { ScreenId } from './theme';

// the four views of the Log & Photos screen, in the order the dial click steps through them
export type LogView = 'list' | 'types' | 'today' | 'photos';
export const LOG_VIEWS: LogView[] = ['list', 'types', 'today', 'photos'];

// the message that drops down on the Overhead screen after the Back button
export interface Banner {
  kind: 'new' | 'again' | 'none';
  tail: string;
  // unix seconds of the first mark
  at: number;
  // changes with every press, so a new one restarts the timer
  n: number;
  // for a message of kind none: nothing in the overhead zone, or the picked aircraft is gone
  why?: 'zone' | 'lost';
}

// what the screens can ask of the app shell
export interface Nav {
  screen: ScreenId;
  go: (id: ScreenId) => void;
  rangeMi: number;
  setRange: (mi: number) => void;
  listOpen: boolean;
  setListOpen: (open: boolean) => void;
  // row highlighted in the radar list, moved by the dial
  listIndex: number;
  // first log row shown, moved by the dial
  logIndex: number;
  logView: LogView;
  setLogView: (v: LogView) => void;
  // the photo shown in the photos view, moved by the dial
  photoIndex: number;
  // opens an aircraft from the Radar on the Overhead screen
  open: (hex: string) => void;
  banner: Banner | null;
}

export interface AppContext {
  repo: Repo;
  nav: Nav;
}

export const Ctx = createContext<AppContext | null>(null);

export function useApp(): AppContext {
  const c = useContext(Ctx);
  if (!c) throw new Error('missing app context');
  return c;
}

export function useRepo(): RepoState {
  const { repo } = useApp();
  return useSyncExternalStore(repo.subscribe, repo.getSnapshot);
}

export const hereOf = (s: RepoState): Coord | null => s.settings.manual ?? s.fix;

// why nothing is on screen yet
export function waitingFor(s: RepoState): { title: string; detail: string | null } {
  if (!hereOf(s)) {
    return s.fixError
      ? { title: 'Cannot Find Your Location', detail: `${s.fixError}. Trying again soon.` }
      : { title: 'Finding Your Location', detail: 'Using the location from your phone.' };
  }
  if (s.aircraft.status === 'error' && !s.aircraft.data) {
    return { title: 'Cannot Reach the Flight Data', detail: `${s.aircraft.error}. Trying again soon.` };
  }
  return { title: 'Listening for Aircraft', detail: null };
}

// the small "Data: adsb.lol · 4 s ago" line, or a note that the data is old
export function dataNote(s: RepoState): string {
  if (!s.provider || !s.aircraftAt) return s.aircraft.status === 'error' ? 'No Flight Data' : 'Waiting for Data';
  const name = PROVIDER_NAMES[s.provider];
  if (s.aircraft.status === 'error') return `Offline. Showing ${clock(s.aircraftAt, s.offsetS, s.settings.clock24)} · ${name}`;
  return `Data: ${name} · ${ago(s.nowS, s.aircraftAt)}`;
}

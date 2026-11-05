import { createContext, useContext, useSyncExternalStore } from 'react';
import { PROVIDER_NAMES } from '../data/adsb';
import { ago, clock } from '../data/format';
import type { Repo, RepoState } from '../data/repo';
import type { Coord } from '../data/types';
import type { ScreenId } from './theme';

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
      ? { title: 'Cannot find your location', detail: `${s.fixError}. Trying again soon.` }
      : { title: 'Finding your location', detail: 'Using the location from your phone.' };
  }
  if (s.aircraft.status === 'error' && !s.aircraft.data) {
    return { title: 'Cannot reach the flight data', detail: `${s.aircraft.error}. Trying again soon.` };
  }
  return { title: 'Listening for aircraft', detail: null };
}

// the small "Data: adsb.lol · 4 s ago" line, or a note that the data is old
export function dataNote(s: RepoState): string {
  if (!s.provider || !s.aircraftAt) return s.aircraft.status === 'error' ? 'No flight data' : 'Waiting for data';
  const name = PROVIDER_NAMES[s.provider];
  if (s.aircraft.status === 'error') return `Offline. Showing ${clock(s.aircraftAt, s.offsetS, s.settings.clock24)} · ${name}`;
  return `Data: ${name} · ${ago(s.nowS, s.aircraftAt)}`;
}

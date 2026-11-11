import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { RADAR_RANGES_MI, rangeFor } from './data/emergency';
import type { AlertState, Repo } from './data/repo';
import { attachInput } from './input';
import { Frame } from './ui/common';
import EmergencyFlash from './ui/EmergencyFlash';
import { WarnGlyph } from './ui/icons';
import Arrivals from './ui/screens/Arrivals';
import Log, { logViewLength, LOG_ROWS_SHOWN } from './ui/screens/Log';
import Overhead from './ui/screens/Overhead';
import Radar, { keyAtRow, rowsInRange } from './ui/screens/Radar';
import Watchlist from './ui/screens/Watchlist';
import { Ctx, LOG_VIEWS, type AppContext, type Banner, type LogView, type Nav } from './ui/state';
import { fmtAlt, fmtDist } from './data/units';
import { dirText } from './data/format';
import type { ScreenId } from './ui/theme';

const DEFAULT_RANGE_MI = 15;
// how long the Back button message stays up
const BANNER_MS = 3000;

export default function App({ repo }: { repo: Repo }) {
  const s = useSyncExternalStore(repo.subscribe, repo.getSnapshot);
  const [screen, setScreen] = useState<ScreenId>('overhead');
  const [rangeMi, setRangeState] = useState<number>(DEFAULT_RANGE_MI);
  const [listOpen, setListOpen] = useState(false);
  const [listIndex, setListIndex] = useState(0);
  const [logIndex, setLogIndex] = useState(0);
  const [logView, setLogViewState] = useState<LogView>('list');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [flash, setFlash] = useState<AlertState | null>(null);
  const bannerN = useRef(0);
  // where the radar was when an aircraft was opened from it, so Radar takes you back to the same place
  const radarBack = useRef(false);

  // the input handlers are attached once, so they read the current values through this
  const live = useRef({ screen, rangeMi, listOpen, listIndex, logIndex, logView, photoIndex, flash });
  live.current = { screen, rangeMi, listOpen, listIndex, logIndex, logView, photoIndex, flash };

  const setLogView = useCallback((v: LogView) => {
    setLogViewState(v);
    setLogIndex(0);
    setPhotoIndex(0);
  }, []);

  const go = useCallback(
    (id: ScreenId) => {
      const cur = live.current;
      // the Overhead button always returns to the closest aircraft
      if (id === 'overhead') repo.unpick();
      if (id === cur.screen) {
        // pressing the button for the screen you are on goes back to its main view
        if (id === 'radar') setListOpen(false);
        if (id === 'log') setLogView('list');
        return;
      }
      const backToRadar = id === 'radar' && cur.screen === 'overhead' && repo.getSnapshot().picked !== null;
      setScreen(id);
      setListOpen(backToRadar ? radarBack.current : false);
      if (id === 'log') setLogView('list');
      repo.setScreen(id);
    },
    [repo, setLogView],
  );

  // a plane picked on the radar, by touch or by the dial click
  const open = useCallback(
    (hex: string) => {
      radarBack.current = live.current.listOpen;
      repo.pick(hex);
      setScreen('overhead');
      setListOpen(false);
      repo.setScreen('overhead');
    },
    [repo],
  );

  const setRange = useCallback(
    (mi: number) => {
      setRangeState(mi);
      setListIndex(0);
      repo.setRange(mi);
    },
    [repo],
  );

  // a new alert starts the flash. the flash ends by itself, by a touch or by any button
  useEffect(() => {
    if (s.alert) setFlash(s.alert);
  }, [s.alert?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  const finishFlash = useCallback(() => {
    const f = live.current.flash;
    if (!f) return;
    setFlash(null);
    repo.ackAlert();
    if (repo.getSnapshot().settings.emergencyJump) {
      setRange(rangeFor(f.info.distMi));
      setScreen('radar');
      setListOpen(false);
      repo.setScreen('radar');
    }
  }, [repo, setRange]);

  // the Back button message goes away by itself
  useEffect(() => {
    if (!banner) return;
    const n = banner.n;
    const t = setTimeout(() => setBanner(b => (b && b.n === n ? null : b)), BANNER_MS);
    return () => clearTimeout(t);
  }, [banner?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return attachInput(
      {
        onScreen: go,
        onClick: () => {
          const cur = live.current;
          if (cur.screen === 'radar') {
            if (!cur.listOpen) return setListOpen(true);
            const key = keyAtRow(repo.getSnapshot(), cur.rangeMi, cur.listIndex);
            if (key) open(key);
          } else if (cur.screen === 'log') {
            // each click steps to the next of the four views
            setLogView(LOG_VIEWS[(LOG_VIEWS.indexOf(cur.logView) + 1) % LOG_VIEWS.length]!);
          }
        },
        onBack: () => {
          if (live.current.screen !== 'overhead') return;
          const r = repo.markSeen();
          const n = ++bannerN.current;
          setBanner(r.kind === 'none' ? { kind: 'none', tail: '', at: 0, n, why: r.why } : { kind: r.kind, tail: r.tail, at: r.at, n });
        },
        onDial: step => {
          const cur = live.current;
          if (cur.screen === 'radar') {
            if (cur.listOpen) {
              const n = rowsInRange(repo.getSnapshot(), cur.rangeMi);
              setListIndex(i => Math.max(0, Math.min(Math.max(0, n - 1), i + step)));
            } else {
              // clockwise zooms in, to a smaller range
              const at = RADAR_RANGES_MI.indexOf(cur.rangeMi as (typeof RADAR_RANGES_MI)[number]);
              const next = RADAR_RANGES_MI[Math.max(0, Math.min(RADAR_RANGES_MI.length - 1, (at < 0 ? 2 : at) - step))]!;
              setRange(next);
            }
          } else if (cur.screen === 'log') {
            const s = repo.getSnapshot();
            if (cur.logView === 'photos') {
              const last = Math.max(0, s.logSeen.length - 1);
              setPhotoIndex(i => Math.max(0, Math.min(last, i + step)));
            } else {
              const max = Math.max(0, logViewLength(s, cur.logView) - LOG_ROWS_SHOWN);
              setLogIndex(i => Math.max(0, Math.min(max, i + step)));
            }
          } else if (cur.screen === 'arrivals') {
            repo.cycleArrivalsAirport();
          }
        },
        onAny: () => {
          if (!live.current.flash) return false;
          finishFlash();
          return true;
        },
      },
      () => repo.getSnapshot().settings.dialReverse,
    );
  }, [repo, go, open, setLogView, setRange, finishFlash]);

  const nav: Nav = useMemo(
    () => ({ screen, go, rangeMi, setRange, listOpen, setListOpen, listIndex, logIndex, logView, setLogView, photoIndex, open, banner }),
    [screen, go, rangeMi, setRange, listOpen, listIndex, logIndex, logView, setLogView, photoIndex, open, banner],
  );
  const ctx: AppContext = useMemo(() => ({ repo, nav }), [repo, nav]);

  const e = s.emergencies[0] ?? null;
  return (
    <Ctx.Provider value={ctx}>
      <Frame
        active={screen}
        onPick={go}
        gap={screen === 'arrivals' ? 8 : 12}
        strip={
          e && screen !== 'radar' && !flash ? (
            <div
              onPointerDown={() => {
                setRange(rangeFor(e.distMi));
                go('radar');
              }}
              style={{
                flex: 'none',
                height: 40,
                background: '#FFB4A2',
                color: '#4A1100',
                borderRadius: 20,
                padding: '0 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 18,
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}>
              <WarnGlyph size={24} color="#4A1100" />
              <span>{[e.code, e.callsign ?? e.reg ?? e.hex.toUpperCase(), `${fmtDist(e.distMi, s.settings.units)} ${dirText(e.bearingDeg)}`, fmtAlt(e.altFt, s.settings.units)].join(' · ')}</span>
              <span style={{ marginLeft: 'auto', fontSize: 15, fontWeight: 700, color: '#6B1D08' }}>Tap for Radar</span>
            </div>
          ) : null
        }>
        {screen === 'overhead' ? <Overhead /> : null}
        {screen === 'radar' ? <Radar /> : null}
        {screen === 'watchlist' ? <Watchlist /> : null}
        {screen === 'log' ? <Log /> : null}
        {screen === 'arrivals' ? <Arrivals /> : null}
      </Frame>
      {flash ? <EmergencyFlash alert={flash} units={s.settings.units} onDone={finishFlash} /> : null}
    </Ctx.Provider>
  );
}

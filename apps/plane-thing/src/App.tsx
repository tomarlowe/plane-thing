import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { RADAR_RANGES_MI, rangeFor } from './data/emergency';
import type { AlertState, Repo } from './data/repo';
import { attachInput } from './input';
import { Frame } from './ui/common';
import EmergencyFlash from './ui/EmergencyFlash';
import { WarnGlyph } from './ui/icons';
import Arrivals from './ui/screens/Arrivals';
import Log, { LOG_ROWS_SHOWN } from './ui/screens/Log';
import Overhead from './ui/screens/Overhead';
import Radar, { rowsInRange } from './ui/screens/Radar';
import Watchlist from './ui/screens/Watchlist';
import { Ctx, type AppContext, type Nav } from './ui/state';
import { fmtAlt, fmtDist } from './data/units';
import { dirText } from './data/format';
import type { ScreenId } from './ui/theme';

const DEFAULT_RANGE_MI = 15;

export default function App({ repo }: { repo: Repo }) {
  const s = useSyncExternalStore(repo.subscribe, repo.getSnapshot);
  const [screen, setScreen] = useState<ScreenId>('overhead');
  const [rangeMi, setRangeState] = useState<number>(DEFAULT_RANGE_MI);
  const [listOpen, setListOpen] = useState(false);
  const [listIndex, setListIndex] = useState(0);
  const [logIndex, setLogIndex] = useState(0);
  const [flash, setFlash] = useState<AlertState | null>(null);

  // the input handlers are attached once, so they read the current values through this
  const live = useRef({ screen, rangeMi, listOpen, listIndex, logIndex, flash });
  live.current = { screen, rangeMi, listOpen, listIndex, logIndex, flash };

  const go = useCallback(
    (id: ScreenId) => {
      const cur = live.current;
      if (id === cur.screen) {
        // pressing the button for the screen you are on goes back to its main view
        if (id === 'radar') setListOpen(false);
        return;
      }
      setScreen(id);
      setListOpen(false);
      repo.setScreen(id);
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

  useEffect(() => {
    return attachInput(
      {
        onScreen: go,
        onClick: () => {
          if (live.current.screen === 'radar') setListOpen(o => !o);
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
            const max = Math.max(0, repo.getSnapshot().logRecent.length - LOG_ROWS_SHOWN);
            setLogIndex(i => Math.max(0, Math.min(max, i + step)));
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
  }, [repo, go, setRange, finishFlash]);

  const nav: Nav = useMemo(
    () => ({ screen, go, rangeMi, setRange, listOpen, setListOpen, listIndex, logIndex }),
    [screen, go, rangeMi, setRange, listOpen, listIndex, logIndex],
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
              <span style={{ marginLeft: 'auto', fontSize: 15, fontWeight: 700, color: '#6B1D08' }}>Tap for radar</span>
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

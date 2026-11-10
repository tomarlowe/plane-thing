import type { Aircraft, EmergencyCode, EmergencyInfo } from './types';

export const EMERGENCY_CODES: EmergencyCode[] = ['7500', '7600', '7700'];

// the alert radius is fixed on purpose. it is not a setting
export const ALERT_RADIUS_MI = 100;

export const EMERGENCY_LABELS: Record<EmergencyCode, string> = {
  '7500': 'Hijack Code',
  '7600': 'Radio Failure',
  '7700': 'General Emergency',
};

// a code must be heard on two separate updates at least this far apart before it counts. pilots dial through codes
// on the way to the one they mean, and a data glitch is not an emergency
const MIN_GAP_S = 4;
// an episode is over once the code has not been heard for this long. a new one can alert again
const EPISODE_END_S = 600;
// an emergency stays on the watchlist this long after it was last heard
const SHOW_S = 180;

export const isEmergencyCode = (s: string | null): s is EmergencyCode => s === '7500' || s === '7600' || s === '7700';

interface Track {
  code: EmergencyCode;
  firstS: number;
  lastS: number;
  hits: number;
  confirmedS: number | null;
  info: EmergencyInfo | null;
}

export class EmergencyTracker {
  private tracks = new Map<string, Track>();

  // feed it every aircraft heard. non emergencies are ignored. returns the emergencies newly confirmed by this update
  observe(nowS: number, heard: Aircraft[]): EmergencyInfo[] {
    const fresh: EmergencyInfo[] = [];
    const seenNow = new Set<string>();
    for (const a of heard) {
      if (!isEmergencyCode(a.squawk) || a.distMi > ALERT_RADIUS_MI || a.onGround) continue;
      if (seenNow.has(a.hex)) continue;
      seenNow.add(a.hex);
      let t = this.tracks.get(a.hex);
      if (!t || t.code !== a.squawk || nowS - t.lastS > EPISODE_END_S) {
        t = { code: a.squawk, firstS: nowS, lastS: nowS, hits: 1, confirmedS: null, info: null };
        this.tracks.set(a.hex, t);
      } else if (nowS - t.lastS >= MIN_GAP_S) {
        t.hits++;
        t.lastS = nowS;
      } else {
        // heard again inside the gap, so it does not count as a second update
      }
      const info = this.describe(a, t, nowS);
      if (t.confirmedS !== null) t.info = info;
      if (t.confirmedS === null && t.hits >= 2) {
        t.confirmedS = nowS;
        t.info = { ...info, sinceS: nowS };
        fresh.push(t.info);
      }
    }
    // forget tracks that never confirmed and went quiet
    for (const [hex, t] of this.tracks) {
      if (t.confirmedS === null && nowS - t.lastS > 120) this.tracks.delete(hex);
      else if (nowS - t.lastS > EPISODE_END_S) this.tracks.delete(hex);
    }
    return fresh;
  }

  private describe(a: Aircraft, t: Track, nowS: number): EmergencyInfo {
    return {
      code: t.code,
      label: EMERGENCY_LABELS[t.code],
      hex: a.hex,
      callsign: a.callsign,
      reg: a.reg,
      type: a.type,
      desc: a.desc,
      distMi: a.distMi,
      bearingDeg: a.bearingDeg,
      altFt: a.altFt,
      lat: a.lat,
      lon: a.lon,
      sinceS: t.confirmedS ?? nowS,
      lastS: nowS,
    };
  }

  // confirmed emergencies heard recently, nearest first
  active(nowS: number): EmergencyInfo[] {
    const out: EmergencyInfo[] = [];
    for (const t of this.tracks.values()) {
      if (t.confirmedS !== null && t.info && nowS - t.info.lastS <= SHOW_S) out.push(t.info);
    }
    return out.sort((a, b) => a.distMi - b.distMi);
  }

  // true while a code has been heard once and still needs its second update, so the caller can look again soon
  hasPending(nowS: number): boolean {
    for (const t of this.tracks.values()) if (t.confirmedS === null && nowS - t.lastS < 60) return true;
    return false;
  }
}

// the smallest zoom step that shows the aircraft with room to spare, for the jump to the radar
export const RADAR_RANGES_MI = [3, 6, 15, 50, 100] as const;

export function rangeFor(distMi: number): number {
  for (const r of RADAR_RANGES_MI) if (distMi <= r * 0.9) return r;
  return RADAR_RANGES_MI[RADAR_RANGES_MI.length - 1]!;
}

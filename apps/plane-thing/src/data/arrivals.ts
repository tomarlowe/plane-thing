import { isHelicopter } from './adsb';
import { angleDiff, bearingDeg, distanceMi } from './geo';
import type { Aircraft, Coord } from './types';

export type ArrivalStatus = 'final' | 'approach' | 'descending' | 'inbound';

export interface Arrival {
  hex: string;
  callsign: string | null;
  reg: string | null;
  type: string | null;
  etaS: number;
  distMi: number;
  altFt: number | null;
  status: ArrivalStatus;
}

export const STATUS_LABEL: Record<ArrivalStatus, string> = {
  final: 'Final Approach',
  approach: 'Approach',
  descending: 'Descending',
  inbound: 'Inbound',
};

// aircraft near the airport that look like they are coming in to land: airborne, heading for it, low or descending.
// the time of arrival is worked out from distance and ground speed, so it is an estimate
export function inbound(list: Aircraft[], airport: Coord, nowS: number, max = 6): Arrival[] {
  const out: Arrival[] = [];
  for (const a of list) {
    if (a.onGround || a.gsKt === null || a.gsKt < 60 || a.trackDeg === null || a.altFt === null) continue;
    if (isHelicopter(a)) continue;
    const d = distanceMi(a, airport);
    if (d > 45) continue;
    const toAirport = bearingDeg(a, airport);
    // within a mile of the field the track can swing wildly, so it is not judged
    if (d > 1.5 && Math.abs(angleDiff(a.trackDeg, toAirport)) > 40) continue;
    const descending = (a.vertFpm ?? 0) <= -300;
    const low = a.altFt < 8000;
    if (!descending && !low) continue;
    // a high aircraft cruising level is just passing over
    if (a.altFt > 12000 && !descending) continue;
    const status: ArrivalStatus =
      d <= 5 && a.altFt < 3000 ? 'final' : a.altFt < 7000 && d <= 20 ? 'approach' : descending ? 'descending' : 'inbound';
    const hours = d / (a.gsKt * 1.150779);
    out.push({
      hex: a.hex,
      callsign: a.callsign,
      reg: a.reg,
      type: a.type,
      etaS: nowS + Math.round(hours * 3600),
      distMi: d,
      altFt: a.altFt,
      status,
    });
  }
  return out.sort((x, y) => x.etaS - y.etaS).slice(0, max);
}

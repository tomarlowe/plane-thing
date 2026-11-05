import airportsUrl from '../data/airports.bin.gz?url';

// the packed airport file ships inside the app and is fetched from the app's own origin
export async function loadAirportFile(): Promise<Uint8Array> {
  const res = await fetch(airportsUrl);
  if (!res.ok) throw new Error('The airport file did not load');
  return new Uint8Array(await res.arrayBuffer());
}

// seconds to add to unix time for local time. the zone name is trusted first because it follows daylight saving by
// itself, then the offset the phone reported, then the zone of the page
export function zoneOffsetS(tzIana: string | null, reportedMinutes: number | null, at = new Date()): number {
  if (tzIana) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tzIana,
        hourCycle: 'h23',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      }).formatToParts(at);
      const g = (t: string) => Number(parts.find(p => p.type === t)?.value);
      const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'));
      const diff = Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 1000);
      if (Number.isFinite(diff)) return diff;
    } catch {
      // an unknown zone name falls through
    }
  }
  if (reportedMinutes !== null && Number.isFinite(reportedMinutes)) return reportedMinutes * 60;
  return -at.getTimezoneOffset() * 60;
}

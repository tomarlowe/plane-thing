// SIMULATED replies written from memory of the published formats. a real service can differ, so these prove the
// parsers handle what they were written for, not that the live services answer this way
import { describe, expect, test } from 'bun:test';
import { inbound } from '../data/arrivals';
import { faaLine, parseFaa, statusFor } from '../data/faa';
import {
  commonsUrl,
  parseAirportData,
  parseCommons,
  parsePlanespotters,
  planespottersUrl,
  sisterShips,
} from '../data/photos';
import { parseRouteItem, parseRouteSet, routeBody, wantsRoute } from '../data/route';
import { fleetKey } from '../data/adsb';
import type { Aircraft } from '../data/types';

const ac = (o: Partial<Aircraft> = {}): Aircraft => ({
  hex: 'a1b2c3',
  reg: 'N372DN',
  callsign: 'DAL1482',
  type: 'A321',
  desc: 'Airbus A-321',
  operator: 'Delta Air Lines',
  lat: 40.64,
  lon: -73.6,
  altFt: 3100,
  onGround: false,
  gsKt: 150,
  trackDeg: 270,
  vertFpm: -700,
  squawk: '3421',
  category: 'A3',
  military: false,
  seenPosS: 1,
  distMi: 5,
  bearingDeg: 90,
  ...o,
});

describe('FAA status', () => {
  const xml = `<?xml version="1.0"?>
<AIRPORT_STATUS_INFORMATION>
  <Update_Time>Tue Nov 04 19:30:00 2026 GMT</Update_Time>
  <Delay_type>
    <Name>Ground Delay Programs</Name>
    <Ground_Delay_List>
      <Ground_Delay><ARPT>EWR</ARPT><Reason>thunderstorms</Reason><Avg>47 minutes</Avg><Max>1 hour</Max></Ground_Delay>
      <Ground_Delay><ARPT>SFO</ARPT><Reason>low ceilings</Reason><Avg>1 hour and 2 minutes</Avg></Ground_Delay>
    </Ground_Delay_List>
  </Delay_type>
  <Delay_type>
    <Name>Ground Stops</Name>
    <Ground_Stop_List>
      <Program><ARPT>LGA</ARPT><Reason>wind &amp; rain</Reason><End_Time>3:30 pm EST</End_Time></Program>
    </Ground_Stop_List>
  </Delay_type>
  <Delay_type>
    <Name>Airport Closures</Name>
    <Airport_Closure_List></Airport_Closure_List>
  </Delay_type>
</AIRPORT_STATUS_INFORMATION>`;
  test('reads each airport under its kind of delay', () => {
    const list = parseFaa(xml);
    expect(list.map(s => s.code)).toEqual(['EWR', 'SFO', 'LGA']);
    expect(list[0]).toEqual({ code: 'EWR', kind: 'Ground delay program', reason: 'thunderstorms', avg: '47 minutes' });
    expect(list[2]).toMatchObject({ kind: 'Ground stop', reason: 'wind & rain', avg: null });
  });
  test('looks up an airport and words the line', () => {
    const list = parseFaa(xml);
    expect(statusFor(list, 'ewr')!.code).toBe('EWR');
    expect(statusFor(list, 'JFK')).toBeNull();
    expect(faaLine(list[0]!)).toBe('Ground delay program, thunderstorms, average 47 minutes');
    expect(faaLine({ code: 'X', kind: 'Airport closed', reason: null, avg: null })).toBe('Airport closed');
  });
  test('an empty or odd reply gives no entries', () => {
    expect(parseFaa('')).toEqual([]);
    expect(parseFaa('<html>not found</html>')).toEqual([]);
  });
});

describe('route estimate', () => {
  test('first and last airport of the route', () => {
    expect(parseRouteItem({ _airports: [{ iata: 'atl' }, { iata: 'LGA' }] })).toEqual({ from: 'ATL', to: 'LGA' });
    expect(parseRouteItem({ _airports: [{ icao: 'KATL' }, { icao: 'KLGA' }] })).toEqual({ from: 'KATL', to: 'KLGA' });
    expect(parseRouteItem({ _airport_codes_iata: 'ATL-DTW-LGA' })).toEqual({ from: 'ATL', to: 'LGA' });
  });
  test('an implausible or unreadable route is dropped', () => {
    expect(parseRouteItem({ plausible: false, _airports: [{ iata: 'ATL' }, { iata: 'LGA' }] })).toBeNull();
    expect(parseRouteItem({ _airports: [{ iata: 'ATL' }] })).toBeNull();
    expect(parseRouteItem(null)).toBeNull();
    expect(parseRouteItem('x')).toBeNull();
  });
  test('a reply holds one entry per callsign', () => {
    const m = parseRouteSet([
      { callsign: 'dal1482 ', _airports: [{ iata: 'ATL' }, { iata: 'LGA' }] },
      { callsign: 'JBU615', plausible: false },
      { nothing: true },
    ]);
    expect(m.get('DAL1482')).toEqual({ from: 'ATL', to: 'LGA' });
    expect(m.get('JBU615')).toBeNull();
    expect(m.size).toBe(2);
    expect(parseRouteSet(null).size).toBe(0);
  });
  test('only airline style callsigns are asked about, and the body names them', () => {
    expect(wantsRoute(ac())).toBe(true);
    expect(wantsRoute(ac({ callsign: 'DAL1482A' }))).toBe(true);
    expect(wantsRoute(ac({ callsign: 'N123AB' }))).toBe(false);
    expect(wantsRoute(ac({ callsign: null }))).toBe(false);
    const body = JSON.parse(new TextDecoder().decode(routeBody([ac({ lat: 40.5, lon: -73.5 })])));
    expect(body).toEqual({ planes: [{ callsign: 'DAL1482', lat: 40.5, lng: -73.5 }] });
  });
});

describe('photos', () => {
  test('planespotters prefers the large thumbnail and keeps the credit', () => {
    const hit = parsePlanespotters({
      photos: [
        {
          thumbnail: { src: 'https://t.example/small.jpg' },
          thumbnail_large: { src: 'https://t.example/large.jpg' },
          link: 'https://www.planespotters.net/photo/1',
          photographer: 'Sample Photographer',
        },
      ],
    })!;
    expect(hit.imageUrl).toBe('https://t.example/large.jpg');
    expect(hit.credit).toEqual({ photographer: 'Sample Photographer', source: 'Planespotters.net', link: 'https://www.planespotters.net/photo/1' });
  });
  test('planespotters with no photos, a missing link or a plain http picture gives nothing', () => {
    expect(parsePlanespotters({ photos: [] })).toBeNull();
    expect(parsePlanespotters({ photos: [{ thumbnail: { src: 'https://t.example/a.jpg' } }] })).toBeNull();
    expect(parsePlanespotters({ photos: [{ thumbnail: { src: 'http://t.example/a.jpg' }, link: 'https://x.example/1' }] })).toBeNull();
    expect(parsePlanespotters(null)).toBeNull();
  });
  test('airport-data', () => {
    const hit = parseAirportData({ status: 200, count: 1, data: [{ image: 'https://img.example/a.jpg', link: 'https://www.airport-data.com/p/1', photographer: 'Someone' }] })!;
    expect(hit.credit.source).toBe('airport-data.com');
    expect(parseAirportData({ status: 200, count: 0, data: [] })).toBeNull();
  });
  test('commons skips non images, strips tags and adds the licence', () => {
    const hit = parseCommons({
      query: {
        pages: [
          { imageinfo: [{ mime: 'application/pdf', thumburl: 'https://c.example/a.png', descriptionurl: 'https://c.example/File:a.pdf' }] },
          {
            imageinfo: [
              {
                mime: 'image/jpeg',
                thumburl: 'https://c.example/b.jpg',
                descriptionurl: 'https://commons.wikimedia.org/wiki/File:b.jpg',
                extmetadata: { Artist: { value: '<a href="x">Jane &amp; Co</a>' }, LicenseShortName: { value: 'CC BY-SA 4.0' } },
              },
            ],
          },
        ],
      },
    })!;
    expect(hit.imageUrl).toBe('https://c.example/b.jpg');
    expect(hit.credit.photographer).toBe('Jane & Co (CC BY-SA 4.0)');
    expect(hit.credit.source).toBe('Wikimedia Commons');
    expect(parseCommons({ query: {} })).toBeNull();
  });
  test('addresses are encoded', () => {
    expect(planespottersUrl('reg', 'A6-EWA')).toBe('https://api.planespotters.net/pub/photos/reg/A6-EWA');
    expect(commonsUrl('Airbus A321')).toContain('Airbus%20A321%20in%20flight');
  });
  test('sister ships are the same airline and type, nearest first, never the aircraft itself', () => {
    const me = ac({ hex: '01', distMi: 3 });
    const list = [me, ac({ hex: '02', distMi: 9 }), ac({ hex: '03', distMi: 4 }), ac({ hex: '04', type: 'B738', distMi: 1 }), ac({ hex: '05', callsign: 'UAL9', distMi: 2 })];
    expect(sisterShips(me, list, fleetKey).map(a => a.hex)).toEqual(['03', '02']);
    expect(sisterShips(ac({ callsign: null }), list, fleetKey)).toEqual([]);
  });
});

describe('arrivals', () => {
  const jfk = { lat: 40.64, lon: -73.78 };
  const now = 1_000_000;
  test('an aircraft on approach gets an estimated time from distance and speed', () => {
    const a = ac({ lat: 40.64, lon: -73.6, altFt: 3100, gsKt: 150, trackDeg: 270, vertFpm: -700 });
    const [r] = inbound([a], jfk, now);
    expect(r!.status).toBe('approach');
    // about 9.5 miles at 150 knots is about 3.3 minutes
    expect(r!.etaS - now).toBeGreaterThan(150);
    expect(r!.etaS - now).toBeLessThan(260);
  });
  test('final approach is close and low', () => {
    const a = ac({ lat: 40.64, lon: -73.7, altFt: 1500, gsKt: 140, trackDeg: 270 });
    expect(inbound([a], jfk, now)[0]!.status).toBe('final');
  });
  test('ground, helicopters, slow, far, cruising, and leaving aircraft are left out', () => {
    const list = [
      ac({ hex: '01', onGround: true }),
      ac({ hex: '02', category: 'A7', type: 'B407' }),
      ac({ hex: '03', gsKt: 40 }),
      ac({ hex: '04', lat: 41.6, lon: -72.5 }),
      ac({ hex: '05', altFt: 36000, vertFpm: 0 }),
      ac({ hex: '06', trackDeg: 90 }),
      ac({ hex: '07', altFt: null }),
    ];
    expect(inbound(list, jfk, now)).toHaveLength(0);
  });
  test('sorted by arrival time and cut to the limit', () => {
    const list = [
      ac({ hex: '01', lon: -73.3, gsKt: 150 }),
      ac({ hex: '02', lon: -73.6, gsKt: 150 }),
      ac({ hex: '03', lon: -73.5, gsKt: 150 }),
    ];
    expect(inbound(list, jfk, now).map(r => r.hex)).toEqual(['02', '03', '01']);
    expect(inbound(list, jfk, now, 2)).toHaveLength(2);
  });
});

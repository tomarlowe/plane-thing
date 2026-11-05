// canonical units in the data layer: statute miles, feet, knots, degrees. the ui converts on display.

export type UnitSystem = 'imperial' | 'aviation' | 'metric';

export interface Coord {
  lat: number;
  lon: number;
}

export type AirportsMode = 'auto' | 'country' | 'world';

export interface Settings {
  units: UnitSystem;
  clock24: boolean;
  // null follows the phone
  manual: Coord | null;
  airportsMode: AirportsMode;
  // two letter country code, used when airportsMode is country
  airportsCountry: string;
  // the log records an aircraft when it comes this close, in miles
  logMi: number;
  // callsigns, tail numbers, type codes or hex codes the user wants flagged
  watch: string[];
  // after the emergency flash, jump to the radar
  emergencyJump: boolean;
  // flips which way the dial zooms
  dialReverse: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  units: 'imperial',
  clock24: false,
  manual: null,
  airportsMode: 'auto',
  airportsCountry: '',
  logMi: 10,
  watch: [],
  emergencyJump: true,
  dialReverse: false,
};

export interface Aircraft {
  hex: string;
  reg: string | null;
  callsign: string | null;
  // icao type code such as B738
  type: string | null;
  // long type name such as "Boeing 737-800"
  desc: string | null;
  operator: string | null;
  lat: number;
  lon: number;
  // null when unknown. 0 on the ground
  altFt: number | null;
  onGround: boolean;
  gsKt: number | null;
  trackDeg: number | null;
  vertFpm: number | null;
  squawk: string | null;
  // adsb emitter category such as A3 (large), A7 (rotorcraft)
  category: string | null;
  military: boolean;
  // seconds since the position was last heard
  seenPosS: number;
  // worked out against the observer
  distMi: number;
  bearingDeg: number;
}

export type FeedStatus = 'idle' | 'loading' | 'ok' | 'error';

export interface Feed<T> {
  data: T | null;
  status: FeedStatus;
  error: string | null;
}

export type EmergencyCode = '7500' | '7600' | '7700';

export interface EmergencyInfo {
  code: EmergencyCode;
  label: string;
  hex: string;
  callsign: string | null;
  reg: string | null;
  type: string | null;
  desc: string | null;
  distMi: number;
  bearingDeg: number;
  altFt: number | null;
  lat: number;
  lon: number;
  // when it was first confirmed, and when last heard
  sinceS: number;
  lastS: number;
}

export interface AirportRec {
  // the code shown on screen: iata when there is one, else icao or the local ident
  code: string;
  name: string;
  lat: number;
  lon: number;
  // 0 large, 1 medium, 2 small, 3 heliport, 4 seaplane base, 5 other
  kind: number;
  country: string;
}

export interface NearAirport extends AirportRec {
  distMi: number;
  bearingDeg: number;
}

// one row of the spotter log. short keys keep the stored size small
export interface LogEntry {
  hex: string;
  // tail number
  r: string | null;
  // callsign
  c: string | null;
  // icao type code
  t: string | null;
  // type name
  d: string | null;
  // operator
  o: string | null;
  // first seen, unix seconds
  f: number;
  // last seen, unix seconds
  l: number;
  // closest pass in tenths of a mile
  m: number;
  // bearing at the closest pass, degrees
  b: number;
  // highest altitude in hundreds of feet
  h: number;
  // times seen, counting a new visit after a gap
  n: number;
  // where the observer was, rounded to two decimals
  p: [number, number];
  // the nearest airport by name when it was first seen
  w: string;
}

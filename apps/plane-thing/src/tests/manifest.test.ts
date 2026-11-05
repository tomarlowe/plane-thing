import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { parseSettings } from '../data/repo';

interface Field {
  type: string;
  data: { key: string; default: unknown; choices?: string[]; choiceLabels?: Record<string, string>; pattern?: string | null };
}
const manifest = JSON.parse(readFileSync(new URL('../../public/manifest.json', import.meta.url), 'utf8')) as {
  id: string;
  name: string;
  version: string;
  description: string;
  permissions: string[];
  settings: string;
  config: Field[];
};

describe('manifest', () => {
  test('identity', () => {
    expect(manifest.id).toBe('01a1a8ce-5e3a-71a1-8619-b65be4e9d5d1');
    expect(manifest.name).toBe('Plane Thing');
    expect(manifest.description.length).toBeGreaterThan(20);
    expect(manifest.permissions).toEqual(['geo']);
    expect(manifest.settings).toBe('settings.html');
  });
  test('every setting the app reads is declared, and nothing else', () => {
    expect(manifest.config.map(f => f.data.key).sort()).toEqual(
      [
        'airports_country',
        'airports_mode',
        'clock',
        'dial_reverse',
        'emergency_jump',
        'location_mode',
        'log_distance',
        'manual_lat',
        'manual_lon',
        'units',
        'watch_list',
      ].sort(),
    );
  });
  test('the declared defaults give the same settings as no values at all', () => {
    const defaults: Record<string, string> = {};
    for (const f of manifest.config) defaults[f.data.key] = f.data.default === null || f.data.default === undefined ? '' : String(f.data.default);
    expect(parseSettings(defaults)).toEqual(parseSettings({}));
  });
  test('every choice of every list is understood by the app', () => {
    const f = (k: string) => manifest.config.find(c => c.data.key === k)!.data;
    for (const c of f('units').choices!) expect(parseSettings({ units: c }).units).toBe(c as 'imperial');
    expect(parseSettings({ clock: f('clock').choices![1]! }).clock24).toBe(true);
    for (const c of f('airports_mode').choices!) expect(parseSettings({ airports_mode: c }).airportsMode).toBe(c as 'auto');
    expect(parseSettings({ location_mode: f('location_mode').choices![1]!, manual_lat: '1', manual_lon: '2' }).manual).toEqual({ lat: 1, lon: 2 });
  });
  test('every choice has a label, and the units labels say knots not mph', () => {
    for (const c of manifest.config) {
      if (c.type !== 'enum') continue;
      for (const choice of c.data.choices!) expect(c.data.choiceLabels![choice]).toBeTruthy();
    }
    const units = manifest.config.find(c => c.data.key === 'units')!.data;
    expect(JSON.stringify(units)).not.toMatch(/mph/);
  });
  test('the country code box accepts two letters and nothing longer', () => {
    const f = manifest.config.find(c => c.data.key === 'airports_country')!;
    expect(f.type).toBe('string');
    const re = new RegExp(f.data.pattern!);
    expect(re.test('US')).toBe(true);
    expect(re.test('gb')).toBe(true);
    expect(re.test('')).toBe(true);
    expect(re.test('USA')).toBe(false);
    expect(re.test('U1')).toBe(false);
  });
});

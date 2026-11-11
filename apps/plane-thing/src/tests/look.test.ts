// plain arithmetic checks, no simulated services involved
import { describe, expect, test } from 'bun:test';
import { clockPosition, elevationDeg, lookCue, upText, usableHeading } from '../data/look';

describe('which heading to trust', () => {
  test('needs a heading and a moving car', () => {
    expect(usableHeading(null, 20)).toBeNull();
    expect(usableHeading(Number.NaN, 20)).toBeNull();
    expect(usableHeading(90, null)).toBeNull();
    expect(usableHeading(90, 1.9)).toBeNull();
    expect(usableHeading(90, 0)).toBeNull();
  });
  test('walking pace and faster is trusted, and the heading is kept in 0 to 360', () => {
    expect(usableHeading(90, 2)).toBe(90);
    expect(usableHeading(-10, 15)).toBe(350);
    expect(usableHeading(370, 15)).toBe(10);
    expect(usableHeading(0, 15)).toBe(0);
  });
});

describe('clock position', () => {
  test('straight ahead is 12, behind is 6, sides are 3 and 9', () => {
    expect(clockPosition(0)).toBe(12);
    expect(clockPosition(90)).toBe(3);
    expect(clockPosition(180)).toBe(6);
    expect(clockPosition(270)).toBe(9);
  });
  test('each hour covers 30 degrees, centred on the hour', () => {
    expect(clockPosition(14)).toBe(12);
    expect(clockPosition(16)).toBe(1);
    expect(clockPosition(344)).toBe(11);
    expect(clockPosition(346)).toBe(12);
    expect(clockPosition(314)).toBe(10);
    expect(clockPosition(316)).toBe(11);
  });
  test('a turn past a full circle or below zero wraps', () => {
    expect(clockPosition(360)).toBe(12);
    expect(clockPosition(390)).toBe(1);
    expect(clockPosition(-30)).toBe(11);
  });
});

describe('how high to look', () => {
  test('is the angle above the horizon', () => {
    expect(elevationDeg(5280, 1)).toBeCloseTo(45, 5);
    expect(elevationDeg(0, 3)).toBe(0);
    expect(elevationDeg(3400, 2.3)).toBeCloseTo(15.6, 1);
  });
  test('directly below the aircraft does not divide by zero', () => {
    const e = elevationDeg(20000, 0);
    expect(Number.isFinite(e)).toBe(true);
    expect(e).toBeGreaterThan(85);
    expect(e).toBeLessThanOrEqual(90);
  });
});

describe('the look cue', () => {
  test('with a trusted heading it says where to look from the car', () => {
    // the aircraft is north-east, the car points east: it is ahead and to the left
    const c = lookCue(45, 2.3, 3400, 90);
    expect(c.relativeDeg).toBe(315);
    expect(c.clockText).toBe("11 o'clock");
    expect(c.compassText).toBe('NE');
    expect(c.carText).toBe('E');
    expect(c.upDeg).toBe(15);
    expect(c.height).toBe('Low');
  });
  test('behind the car and to the right', () => {
    const c = lookCue(200, 3, 8000, 20);
    expect(c.relativeDeg).toBe(180);
    expect(c.clockText).toBe("6 o'clock");
  });
  test('without a heading only the compass point is known', () => {
    const c = lookCue(45, 2.3, 3400, null);
    expect(c.relativeDeg).toBeNull();
    expect(c.clockText).toBeNull();
    expect(c.carText).toBeNull();
    expect(c.compassText).toBe('NE');
    expect(c.upDeg).toBe(15);
  });
  test('low, mid and high split at 30 and 60 degrees', () => {
    const at = (deg: number) => lookCue(0, 1, Math.tan((deg * Math.PI) / 180) * 5280, 0).height;
    expect(at(29)).toBe('Low');
    expect(at(31)).toBe('Mid');
    expect(at(59)).toBe('Mid');
    expect(at(61)).toBe('High');
  });
  test('the angle is rounded to 5 degrees and stays between 0 and 90', () => {
    expect(lookCue(0, 1, 5280, 0).upDeg).toBe(45);
    expect(lookCue(0, 1, 5280 * Math.tan((47 * Math.PI) / 180), 0).upDeg).toBe(45);
    expect(lookCue(0, 1, 5280 * Math.tan((48 * Math.PI) / 180), 0).upDeg).toBe(50);
    expect(lookCue(0, 0, 40000, 0).upDeg).toBe(90);
  });
  test('an unknown altitude leaves the height out, a negative one counts as the ground', () => {
    const none = lookCue(10, 2, null, 0);
    expect(none.upDeg).toBeNull();
    expect(none.height).toBeNull();
    const low = lookCue(10, 2, -50, 0);
    expect(low.upDeg).toBe(0);
    expect(low.height).toBe('Low');
  });
});

describe('the height wording', () => {
  test('reads like the screen', () => {
    expect(upText(lookCue(0, 2.3, 3400, 0))).toBe('Low · About 15° up');
    expect(upText(lookCue(0, 1, 5280, 0))).toBe('Mid · About 45° up');
    expect(upText(lookCue(0, 1, 10000, 0))).toBe('High · About 60° up');
  });
  test('close to straight up says so', () => {
    expect(upText(lookCue(0, 0.02, 20000, 0))).toBe('High · Straight Up');
  });
  test('says so when the height is not known', () => {
    expect(upText(lookCue(0, 2, null, 0))).toBe('Height Unknown');
  });
});

// the capitalization rule for labels on the screen: every word starts with a capital except small words in the middle, and
// units and codes keep their own case
import { describe, expect, test } from 'bun:test';
import { titleLabel } from '../data/format';

describe('title case for labels', () => {
  test('every word starts with a capital', () => {
    expect(titleLabel('aircraft logged')).toBe('Aircraft Logged');
    expect(titleLabel('different types')).toBe('Different Types');
    expect(titleLabel('visually identified')).toBe('Visually Identified');
    expect(titleLabel('now')).toBe('Now');
    expect(titleLabel('away from here')).toBe('Away From Here');
  });
  test('already correct labels are left alone', () => {
    expect(titleLabel('Aircraft Logged')).toBe('Aircraft Logged');
    expect(titleLabel('Seen by Eye')).toBe('Seen by Eye');
  });
  test('small words stay lowercase in the middle', () => {
    expect(titleLabel('tap for radar')).toBe('Tap for Radar');
    expect(titleLabel('seen by eye')).toBe('Seen by Eye');
    expect(titleLabel('turn to scroll and click to open')).toBe('Turn to Scroll and Click to Open');
    expect(titleLabel('nothing overhead to mark')).toBe('Nothing Overhead to Mark');
    expect(titleLabel('on your list')).toBe('On Your List');
    expect(titleLabel('picked from radar')).toBe('Picked From Radar');
  });
  test('a small word at the start is capitalized', () => {
    expect(titleLabel('out of range')).toBe('Out of Range');
    expect(titleLabel('a new day')).toBe('A New Day');
    expect(titleLabel('the closest one')).toBe('The Closest One');
  });
  test('the first word after a separator is capitalized too', () => {
    expect(titleLabel('closest first · within 15 mi')).toBe('Closest First · Within 15 mi');
    expect(titleLabel('not for navigation or safety · the radar')).toBe('Not for Navigation or Safety · The Radar');
    expect(titleLabel('radar: the nearest first')).toBe('Radar: The Nearest First');
    expect(titleLabel('ground delay program, the average 47 minutes')).toBe('Ground Delay Program, The Average 47 minutes');
  });
  test('units, numbers and codes keep their case', () => {
    expect(titleLabel('15 mi away')).toBe('15 mi Away');
    expect(titleLabel('about 15° up')).toBe('About 15° up');
    expect(titleLabel('cruising at 31,000 ft and 360 kt')).toBe('Cruising at 31,000 ft and 360 kt');
    expect(titleLabel('tail N372DN is EMERGENCY')).toBe('Tail N372DN Is EMERGENCY');
    expect(titleLabel('FAA: ground stop at EWR')).toBe('FAA: Ground Stop at EWR');
    expect(titleLabel('average 47 minutes')).toBe('Average 47 minutes');
    expect(titleLabel('closest 2.3 mi ESE')).toBe('Closest 2.3 mi ESE');
  });
  test('spacing and empty text are kept', () => {
    expect(titleLabel('')).toBe('');
    expect(titleLabel('two  words')).toBe('Two  Words');
    expect(titleLabel(' leading')).toBe(' Leading');
  });
});

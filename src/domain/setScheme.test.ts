import { describe, expect, it } from 'vitest';
import { setTargets, targetForSet } from './setScheme';

const pick = (scheme?: Parameters<typeof setTargets>[0]['scheme'], sets = 3, reps = 8) =>
  setTargets({ targetSets: sets, targetReps: reps, scheme }).map((t) => [t.reps, t.load, t.weightPct, t.toFailure, t.dropAfter]);

describe('setTargets', () => {
  it('defaults to straight sets', () => {
    expect(pick()).toEqual([
      [8, 'working', 100, false, false],
      [8, 'working', 100, false, false],
      [8, 'working', 100, false, false],
    ]);
  });

  it('pyramid builds up to the heaviest, lowest-rep set', () => {
    expect(pick('pyramid')).toEqual([
      [12, 'light', 80, false, false],
      [10, 'heavier', 90, false, false],
      [8, 'heaviest', 100, false, false],
    ]);
  });

  it('reverse pyramid starts heaviest then backs off', () => {
    expect(pick('reversePyramid')).toEqual([
      [8, 'heaviest', 100, false, false],
      [10, 'lighter', 90, false, false],
      [12, 'lighter', 80, false, false],
    ]);
  });

  it('top sets go to failure, then one lighter back-off set', () => {
    expect(pick('topSets')).toEqual([
      [8, 'heaviest', 100, true, false],
      [8, 'heaviest', 100, true, false],
      [12, 'lighter', 80, false, false],
    ]);
    expect(pick('topSets', 1)).toEqual([[8, 'heaviest', 100, true, false]]);
  });

  it('drop set and last-max only change the last set', () => {
    expect(pick('dropSet', 2)).toEqual([
      [8, 'working', 100, false, false],
      [8, 'working', 100, true, true],
    ]);
    expect(pick('lastMax', 2).at(-1)).toEqual([8, 'working', 100, true, false]);
  });

  it('extra sets repeat the last target', () => {
    const targets = setTargets({ targetSets: 2, targetReps: 8, scheme: 'reversePyramid' });
    expect(targetForSet(targets, 5)?.reps).toBe(10);
    expect(targetForSet([], 1)).toBeUndefined();
  });
});

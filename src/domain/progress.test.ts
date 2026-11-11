import { describe, expect, it } from 'vitest';
import type { MuscleGroup } from '../db/types';
import { at, makeSession, makeSet, T0 } from '../test/factories';
import { setsByMuscle, strengthChanges, strengthSeries, volumeKg, weeklyActivity, weekStreak } from './progress';

const DAY = 24 * 60 * 60;
const now = at(30 * DAY);

describe('progress', () => {
  it('sums volume and counts sets per muscle, skipping deleted sets and unknown machines', () => {
    const sets = [
      makeSet({ id: 'a', machineId: 'press', reps: 10, weightKg: 40 }),
      makeSet({ id: 'b', machineId: 'row', reps: 8, weightKg: 50 }),
      makeSet({ id: 'c', machineId: 'press', deletedAt: T0 }),
      makeSet({ id: 'd', machineId: 'gone' }),
    ];
    expect(volumeKg(sets)).toBe(400 + 400 + 400);
    const map: Record<string, MuscleGroup> = { press: 'chest', row: 'back' };
    const groups = setsByMuscle(sets, (id) => map[id]);
    expect(groups).toMatchObject({ chest: 1, back: 1, legs: 0 });
  });

  it('buckets sessions into rolling weeks and counts the current streak', () => {
    const sessions = [
      makeSession({ id: 's1', state: 'finished', startedAt: at(29 * DAY) }),
      makeSession({ id: 's2', state: 'finished', startedAt: at(22 * DAY) }),
      makeSession({ id: 's3', state: 'finished', startedAt: at(5 * DAY) }),
      makeSession({ id: 's4', state: 'notStarted', startedAt: at(29 * DAY) }),
    ];
    const sets = [makeSet({ loggedAt: at(29 * DAY) })];
    const weeks = weeklyActivity(sessions, sets, now, 4);
    expect(weeks.map((w) => w.sessions)).toEqual([1, 0, 1, 1]);
    expect(weeks[3]).toMatchObject({ sets: 1, volumeKg: 400 });
    expect(weekStreak(weeks)).toBe(2);
    expect(weekStreak(weeklyActivity([], [], now, 4))).toBe(0);
  });

  it('tracks the heaviest set per session and the change per machine', () => {
    const sets = [
      makeSet({ id: '1', sessionId: 'x', weightKg: 40, loggedAt: at(0) }),
      makeSet({ id: '2', sessionId: 'x', weightKg: 45, loggedAt: at(60) }),
      makeSet({ id: '3', sessionId: 'y', weightKg: 50, loggedAt: at(DAY) }),
      makeSet({ id: '4', sessionId: 'z', weightKg: 47.5, loggedAt: at(2 * DAY) }),
    ];
    expect(strengthSeries(sets, 'm1').map((p) => p.value)).toEqual([45, 50, 47.5]);
    expect(strengthChanges(sets)).toEqual([{ machineId: 'm1', sessions: 3, firstKg: 45, bestKg: 50, latestKg: 47.5 }]);
  });
});

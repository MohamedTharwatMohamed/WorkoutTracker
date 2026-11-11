import type { RoutineItem } from '../db/types';

/** Weight for a set, relative to the item's working weight. */
export type LoadHint = 'working' | 'light' | 'heavier' | 'heaviest' | 'lighter';

export interface SetTarget {
  setNumber: number;
  reps: number;
  /** Keep going until no more good reps are possible; `reps` is the minimum. */
  toFailure: boolean;
  load: LoadHint;
  /** Suggested weight as a percentage of the working weight. */
  weightPct: number;
  /** After this set, drop the weight and continue without resting. */
  dropAfter: boolean;
}

const REP_STEP = 2;
const PCT_STEP = 10;

/** Per-set targets for a routine item, according to its set scheme. */
export function setTargets(item: Pick<RoutineItem, 'targetSets' | 'targetReps' | 'scheme'>): SetTarget[] {
  const n = Math.max(0, Math.floor(item.targetSets));
  const r = item.targetReps;
  const last = n - 1;
  const set = (i: number, t: Partial<SetTarget> = {}): SetTarget => ({
    setNumber: i + 1,
    reps: r,
    toFailure: false,
    load: 'working',
    weightPct: 100,
    dropAfter: false,
    ...t,
  });

  return Array.from({ length: n }, (_, i) => {
    switch (item.scheme) {
      case 'pyramid':
        if (n === 1) return set(i);
        return set(i, {
          reps: r + REP_STEP * (last - i),
          load: i === last ? 'heaviest' : i === 0 ? 'light' : 'heavier',
          weightPct: 100 - PCT_STEP * (last - i),
        });
      case 'reversePyramid':
        return set(i, {
          reps: r + REP_STEP * i,
          load: i === 0 ? 'heaviest' : 'lighter',
          weightPct: 100 - PCT_STEP * i,
        });
      case 'topSets':
        if (n > 1 && i === last) return set(i, { reps: r + 2 * REP_STEP, load: 'lighter', weightPct: 100 - 2 * PCT_STEP });
        return set(i, { toFailure: true, load: 'heaviest' });
      case 'dropSet':
        return i === last ? set(i, { toFailure: true, dropAfter: true }) : set(i);
      case 'lastMax':
        return i === last ? set(i, { toFailure: true }) : set(i);
      default:
        return set(i);
    }
  });
}

/** Target for a given set number; sets beyond the plan repeat the last target. */
export function targetForSet(targets: SetTarget[], setNumber: number): SetTarget | undefined {
  return targets[Math.min(setNumber, targets.length) - 1];
}

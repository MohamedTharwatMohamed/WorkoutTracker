import type { RoutineItem, SetRecord } from '../db/types';

export interface PrefillInput {
  setNumber: number;
  /** Sets on this machine in this session, ordered by setNumber. */
  thisSession: SetRecord[];
  /** Sets on this machine in the last other session, ordered by setNumber. */
  lastSession: SetRecord[];
  target?: RoutineItem;
}

export function prefill(input: PrefillInput): { reps: number; weightKg: number } | null {
  const previous = input.thisSession.at(-1);
  if (previous) return { reps: previous.reps, weightKg: previous.weightKg };

  const sameNumber = input.lastSession.find((s) => s.setNumber === input.setNumber);
  if (sameNumber) return { reps: sameNumber.reps, weightKg: sameNumber.weightKg };

  const target = input.target;
  if (target && target.targetWeightKg !== undefined) {
    return { reps: target.targetReps, weightKg: target.targetWeightKg };
  }
  return null;
}

import { describe, expect, it } from 'vitest';
import { makeSet } from '../test/factories';
import { prefill } from './prefill';

const target = { machineId: 'm1', targetSets: 3, targetReps: 12, targetWeightKg: 30 };

describe('prefill', () => {
  it('uses the previous set on this machine in this session first', () => {
    const result = prefill({
      setNumber: 2,
      thisSession: [makeSet({ reps: 8, weightKg: 45 })],
      lastSession: [makeSet({ setNumber: 2, reps: 5, weightKg: 50 })],
      target,
    });
    expect(result).toEqual({ reps: 8, weightKg: 45 });
  });

  it('falls back to the same set number in the last session', () => {
    const result = prefill({
      setNumber: 2,
      thisSession: [],
      lastSession: [makeSet({ setNumber: 1, reps: 1 }), makeSet({ setNumber: 2, reps: 6, weightKg: 50 })],
      target,
    });
    expect(result).toEqual({ reps: 6, weightKg: 50 });
  });

  it('falls back to the routine target', () => {
    expect(prefill({ setNumber: 4, thisSession: [], lastSession: [makeSet()], target })).toEqual({
      reps: 12,
      weightKg: 30,
    });
  });

  it('returns null for a target without weight, or nothing at all', () => {
    const noWeight = { machineId: 'm1', targetSets: 3, targetReps: 12 };
    expect(prefill({ setNumber: 1, thisSession: [], lastSession: [], target: noWeight })).toBeNull();
    expect(prefill({ setNumber: 1, thisSession: [], lastSession: [] })).toBeNull();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkoutDb } from '../db/schema';
import { at, T0 } from '../test/factories';
import { freshDb } from '../test/db';
import * as routineRepository from './routineRepository';
import * as sessionRepository from './sessionRepository';

let db: WorkoutDb;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(T0));
  db = await freshDb();
});
afterEach(() => vi.useRealTimers());

describe('sessionRepository', () => {
  it('creates a notStarted session from the main routine', async () => {
    await routineRepository.addItem({ machineId: 'a', targetSets: 3, targetReps: 10 });
    await routineRepository.addItem({ machineId: 'b', targetSets: 3, targetReps: 10 });
    const s = await sessionRepository.create();
    expect(s).toMatchObject({ state: 'notStarted', routineId: 'main', machineOrder: ['a', 'b'] });
    expect(await sessionRepository.getOpen()).toEqual(s);
  });

  it('allows only one open session', async () => {
    await sessionRepository.create();
    await expect(sessionRepository.create()).rejects.toThrow('already open');
  });

  it('Start, Finish and a new session afterwards', async () => {
    const s = await sessionRepository.create();
    vi.setSystemTime(new Date(at(60)));
    expect(await sessionRepository.transition(s.id, { type: 'start' })).toMatchObject({
      state: 'active',
      startedAt: at(60),
    });
    const finished = await sessionRepository.transition(s.id, { type: 'finish' });
    expect(finished.state).toBe('finished');
    expect(await sessionRepository.getOpen()).toBeUndefined();
    expect(await sessionRepository.listSince(T0)).toHaveLength(1);
    await expect(sessionRepository.setMachineOrder(s.id, [])).rejects.toThrow('not open');
    await sessionRepository.create();
  });

  it('Discard soft-deletes and frees the open slot', async () => {
    const s = await sessionRepository.create();
    await sessionRepository.transition(s.id, { type: 'discard' });
    expect(await sessionRepository.getOpen()).toBeUndefined();
    expect((await sessionRepository.get(s.id))?.deletedAt).toBe(T0);
    expect(await sessionRepository.listSince('2000-01-01T00:00:00.000Z')).toEqual([]);
  });

  it('ignores invalid events and reports missing sessions', async () => {
    const s = await sessionRepository.create();
    expect(await sessionRepository.transition(s.id, { type: 'finish' })).toEqual(s);
    await expect(sessionRepository.transition('nope', { type: 'start' })).rejects.toThrow('not found');
  });

  it('setMachineOrder and setCurrentMachine', async () => {
    const s = await sessionRepository.create();
    expect((await sessionRepository.setMachineOrder(s.id, ['x', 'y'])).machineOrder).toEqual(['x', 'y']);
    await sessionRepository.setCurrentMachine(s.id, 'y');
    expect((await db.sessions.get(s.id))?.currentMachineId).toBe('y');
  });
});

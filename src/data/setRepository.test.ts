import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkoutDb } from '../db/schema';
import { checkConsistency, isClean } from '../domain/consistency';
import { at, T0 } from '../test/factories';
import { freshDb } from '../test/db';
import * as sessionRepository from './sessionRepository';
import * as setRepository from './setRepository';

let db: WorkoutDb;
const clock = (offsetSec: number) => vi.setSystemTime(new Date(at(offsetSec)));

async function activeSession(): Promise<string> {
  const s = await sessionRepository.create();
  await sessionRepository.transition(s.id, { type: 'start' });
  return s.id;
}

const input = (sessionId: string, setNumber = 1, machineId = 'm1') => ({
  sessionId,
  machineId,
  setNumber,
  reps: 10,
  weightKg: 40,
});

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  clock(0);
  db = await freshDb();
});
afterEach(() => vi.useRealTimers());

describe('add', () => {
  it('writes the set, a journal row and the rest fields', async () => {
    const sessionId = await activeSession();
    clock(10);
    const set = await setRepository.add(input(sessionId), 60);
    expect(set).toMatchObject({ loggedAt: at(10), deletedAt: null });
    expect(set.restBeforeSec).toBeUndefined();
    expect(await db.journal.toArray()).toMatchObject([{ type: 'set.created', entityId: set.id, sessionId }]);
    expect(await db.sessions.get(sessionId)).toMatchObject({
      state: 'resting',
      restStartedAt: at(10),
      restEndsAt: at(70),
    });
  });

  it('records whole seconds since the previous set on any machine', async () => {
    const sessionId = await activeSession();
    clock(10);
    await setRepository.add(input(sessionId, 1, 'm1'), 60);
    clock(105.9);
    const second = await setRepository.add(input(sessionId, 1, 'm2'), 60);
    expect(second.restBeforeSec).toBe(95);
  });

  it('writes nothing when the transaction fails', async () => {
    const sessionId = await activeSession();
    const before = await db.sessions.get(sessionId);
    const spy = vi.spyOn(db.sessions, 'put').mockRejectedValueOnce(new Error('boom'));
    await expect(setRepository.add(input(sessionId), 60)).rejects.toThrow('boom');
    spy.mockRestore();
    expect(await db.sets.count()).toBe(0);
    expect(await db.journal.count()).toBe(0);
    expect(await db.sessions.get(sessionId)).toEqual(before);
  });

  it('refuses sessions that are not started, finished or missing', async () => {
    const s = await sessionRepository.create();
    await expect(setRepository.add(input(s.id), 60)).rejects.toThrow('notStarted');
    await expect(setRepository.add(input('nope'), 60)).rejects.toThrow('Session not found');
  });
});

describe('update, softDelete and restore', () => {
  it('journal each change and stay consistent', async () => {
    const sessionId = await activeSession();
    const set = await setRepository.add(input(sessionId), 60);
    clock(20);
    expect(await setRepository.update(set.id, { reps: 12 })).toMatchObject({ reps: 12, updatedAt: at(20) });
    expect((await setRepository.softDelete(set.id)).deletedAt).toBe(at(20));
    expect(await setRepository.listBySession(sessionId)).toEqual([]);
    expect(await setRepository.listBySession(sessionId, { includeDeleted: true })).toHaveLength(1);
    expect((await setRepository.restore(set.id)).deletedAt).toBeNull();
    const journal = await db.journal.toArray();
    expect(journal.map((j) => j.type)).toEqual(['set.created', 'set.updated', 'set.deleted', 'set.restored']);
    expect(isClean(checkConsistency(journal, await db.sets.toArray()))).toBe(true);
    await expect(setRepository.update('nope', {})).rejects.toThrow('Set not found');
  });

  it('undoing the newest set during rest returns the session to active', async () => {
    const sessionId = await activeSession();
    await setRepository.add(input(sessionId, 1), 60);
    clock(5);
    const newest = await setRepository.add(input(sessionId, 2), 60);
    await setRepository.softDelete(newest.id);
    const session = await db.sessions.get(sessionId);
    expect(session?.state).toBe('active');
    expect(session?.restEndsAt).toBeUndefined();
  });

  it('deleting an older set keeps the rest running', async () => {
    const sessionId = await activeSession();
    const first = await setRepository.add(input(sessionId, 1), 60);
    clock(5);
    await setRepository.add(input(sessionId, 2), 60);
    await setRepository.softDelete(first.id);
    expect((await db.sessions.get(sessionId))?.state).toBe('resting');
  });
});

describe('queries', () => {
  it('listByMachine (newest first), listSince and lastForMachine', async () => {
    const s1 = await activeSession();
    await setRepository.add(input(s1, 1), 60);
    clock(5);
    await setRepository.add(input(s1, 2), 60);
    await setRepository.add(input(s1, 1, 'other'), 60);
    await sessionRepository.transition(s1, { type: 'finish' });

    clock(3600);
    const s2 = await activeSession();
    await setRepository.add(input(s2, 1), 60);

    const byMachine = await setRepository.listByMachine('m1');
    expect(byMachine.map((s) => s.loggedAt)).toEqual([at(3600), at(5), T0]);
    expect(await setRepository.listSince(at(5))).toHaveLength(3);

    const last = await setRepository.lastForMachine('m1', s2);
    expect(last?.sessionId).toBe(s1);
    expect(last?.sets.map((s) => s.setNumber)).toEqual([1, 2]);
    expect(await setRepository.lastForMachine('other', s1)).toBeUndefined();
  });
});

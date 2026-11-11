import type { Iso, Session } from '../db/types';
import { newRecord } from '../domain/ids';
import { isOpen, next, type SessionEvent } from '../domain/sessionMachine';
import { db, deviceId, nowIso, visible, type ReadOptions } from './internal';
import * as routineRepository from './routineRepository';

export class SessionError extends Error {}

export async function getOpen(): Promise<Session | undefined> {
  const open = (await db().sessions.where('state').anyOf('notStarted', 'active', 'resting').toArray())
    .filter(isOpen)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return open[0];
}

export async function get(id: string): Promise<Session | undefined> {
  return db().sessions.get(id);
}

/** Creates a notStarted session from the main routine. Only one session can be open. */
export async function create(): Promise<Session> {
  const routine = await routineRepository.get();
  const device = await deviceId();
  return db().transaction('rw', db().sessions, async () => {
    if (await getOpen()) throw new SessionError('A session is already open');
    const session: Session = {
      ...newRecord(device, nowIso()),
      routineId: routine.id,
      state: 'notStarted',
      machineOrder: routine.items.map((i) => i.machineId),
    };
    await db().sessions.add(session);
    return session;
  });
}

export async function setMachineOrder(sessionId: string, ids: string[]): Promise<Session> {
  const device = await deviceId();
  return db().transaction('rw', db().sessions, async () => {
    const session = await db().sessions.get(sessionId);
    if (!session || !isOpen(session)) throw new SessionError('Session is not open');
    const updated = { ...session, machineOrder: ids, updatedAt: nowIso(), deviceId: device };
    await db().sessions.put(updated);
    return updated;
  });
}

export async function setCurrentMachine(sessionId: string, machineId: string): Promise<void> {
  const device = await deviceId();
  await db().sessions.update(sessionId, {
    currentMachineId: machineId,
    updatedAt: nowIso(),
    deviceId: device,
  });
}

/** Applies a session event. Invalid events leave the session unchanged. */
export async function transition(sessionId: string, event: SessionEvent): Promise<Session> {
  const device = await deviceId();
  return db().transaction('rw', db().sessions, async () => {
    const session = await db().sessions.get(sessionId);
    if (!session) throw new SessionError('Session not found');
    const updated = next(session, event, nowIso());
    if (updated === session) return session;
    const saved = { ...updated, deviceId: device };
    await db().sessions.put(saved);
    return saved;
  });
}

export async function listSince(since: Iso, options: ReadOptions = {}): Promise<Session[]> {
  return visible(await db().sessions.where('startedAt').aboveOrEqual(since).toArray(), options);
}

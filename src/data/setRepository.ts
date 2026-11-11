import type { JournalType, SetRecord } from '../db/types';
import { newRecord } from '../domain/ids';
import { actualRestSec } from '../domain/restTimer';
import { next } from '../domain/sessionMachine';
import { db, deviceId, nowIso, visible, type ReadOptions } from './internal';

export class SetError extends Error {}

export interface NewSet {
  sessionId: string;
  machineId: string;
  setNumber: number;
  reps: number;
  weightKg: number;
}

const byLoggedAtDesc = (a: SetRecord, b: SetRecord) => b.loggedAt.localeCompare(a.loggedAt);
const bySetNumber = (a: SetRecord, b: SetRecord) => a.setNumber - b.setNumber;

async function liveSetsOf(sessionId: string): Promise<SetRecord[]> {
  return visible(await db().sets.where('sessionId').equals(sessionId).toArray());
}

function journal(type: JournalType, set: SetRecord, at: string) {
  return db().journal.add({ at, type, entityId: set.id, sessionId: set.sessionId });
}

/** Saves a set, journals it and starts the rest timer, all in one transaction. */
export async function add(input: NewSet, restSec: number): Promise<SetRecord> {
  const device = await deviceId();
  const d = db();
  return d.transaction('rw', d.sets, d.journal, d.sessions, async () => {
    const session = await d.sessions.get(input.sessionId);
    if (!session || session.deletedAt !== null) throw new SetError('Session not found');
    if (session.state !== 'active' && session.state !== 'resting') {
      throw new SetError(`Cannot log a set while the session is ${session.state}`);
    }
    const now = nowIso();
    const previous = (await liveSetsOf(input.sessionId)).sort(byLoggedAtDesc)[0];
    const set: SetRecord = { ...newRecord(device, now), ...input, loggedAt: now };
    if (previous) set.restBeforeSec = actualRestSec(previous.loggedAt, now);
    await d.sets.add(set);
    await journal('set.created', set, now);
    await d.sessions.put({ ...next(session, { type: 'setSaved', restSec }, now), deviceId: device });
    return set;
  });
}

async function change(
  id: string,
  type: JournalType,
  apply: (set: SetRecord, now: string) => SetRecord,
  after?: (before: SetRecord, now: string) => Promise<void>,
): Promise<SetRecord> {
  const device = await deviceId();
  const d = db();
  return d.transaction('rw', d.sets, d.journal, d.sessions, async () => {
    const existing = await d.sets.get(id);
    if (!existing) throw new SetError('Set not found');
    const now = nowIso();
    const updated = { ...apply(existing, now), updatedAt: now, deviceId: device };
    if (after) await after(existing, now);
    await d.sets.put(updated);
    await journal(type, updated, now);
    return updated;
  });
}

export function update(id: string, patch: { reps?: number; weightKg?: number }): Promise<SetRecord> {
  return change(id, 'set.updated', (set) => ({ ...set, ...patch }));
}

/** Soft-deletes a set. Undoing the newest set while resting returns the session to active. */
export async function softDelete(id: string): Promise<SetRecord> {
  const device = await deviceId();
  return change(
    id,
    'set.deleted',
    (set, now) => ({ ...set, deletedAt: now }),
    async (before, now) => {
      if (before.deletedAt !== null) return;
      const session = await db().sessions.get(before.sessionId);
      if (!session || session.state !== 'resting') return;
      const newest = (await liveSetsOf(before.sessionId)).sort(byLoggedAtDesc)[0];
      if (newest?.id !== before.id) return;
      await db().sessions.put({
        ...next(session, { type: 'lastSetUndone' }, now),
        deviceId: device,
      });
    },
  );
}

export function restore(id: string): Promise<SetRecord> {
  return change(id, 'set.restored', (set) => ({ ...set, deletedAt: null }));
}

export async function listBySession(sessionId: string, options: ReadOptions = {}): Promise<SetRecord[]> {
  return visible(await db().sets.where('sessionId').equals(sessionId).toArray(), options).sort(
    (a, b) => a.loggedAt.localeCompare(b.loggedAt),
  );
}

/** Sets on one machine, newest first. */
export async function listByMachine(machineId: string, options: ReadOptions = {}): Promise<SetRecord[]> {
  const rows = await db()
    .sets.where('[machineId+loggedAt]')
    .between([machineId, ''], [machineId, '\uffff'])
    .reverse()
    .toArray();
  return visible(rows, options);
}

export async function listSince(since: string, options: ReadOptions = {}): Promise<SetRecord[]> {
  return visible(await db().sets.where('loggedAt').aboveOrEqual(since).toArray(), options);
}

/** The sets of the most recent other session with sets on this machine, by set number. */
export async function lastForMachine(
  machineId: string,
  beforeSessionId: string,
): Promise<{ sessionId: string; sets: SetRecord[] } | undefined> {
  const rows = await listByMachine(machineId);
  const latest = rows.find((s) => s.sessionId !== beforeSessionId);
  if (!latest) return undefined;
  return {
    sessionId: latest.sessionId,
    sets: rows.filter((s) => s.sessionId === latest.sessionId).sort(bySetNumber),
  };
}

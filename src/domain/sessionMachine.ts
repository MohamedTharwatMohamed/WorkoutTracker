import type { Iso, Session } from '../db/types';

export type SessionEvent =
  | { type: 'start' }
  | { type: 'discard' }
  | { type: 'setSaved'; restSec: number }
  | { type: 'restEnded' }
  | { type: 'restSkipped' }
  | { type: 'restAdjusted'; deltaSec: number }
  | { type: 'lastSetUndone' }
  | { type: 'finish' };

export const STALE_AFTER_MS = 12 * 60 * 60 * 1000;

function addSeconds(iso: Iso, seconds: number): Iso {
  return new Date(Date.parse(iso) + seconds * 1000).toISOString();
}

function withoutRest(session: Session): Session {
  const copy = { ...session };
  delete copy.restStartedAt;
  delete copy.restEndsAt;
  return copy;
}

/** Returns the next session; invalid events return the same object unchanged. */
export function next(session: Session, event: SessionEvent, now: Iso): Session {
  const { state } = session;
  switch (event.type) {
    case 'start':
      if (state !== 'notStarted') return session;
      return { ...session, state: 'active', startedAt: now, updatedAt: now };
    case 'discard':
      if (state !== 'notStarted') return session;
      return { ...session, deletedAt: now, updatedAt: now };
    case 'setSaved':
      if (state !== 'active' && state !== 'resting') return session;
      return {
        ...session,
        state: 'resting',
        restStartedAt: now,
        restEndsAt: addSeconds(now, event.restSec),
        updatedAt: now,
      };
    case 'restEnded':
    case 'restSkipped':
    case 'lastSetUndone':
      if (state !== 'resting') return session;
      return { ...withoutRest(session), state: 'active', updatedAt: now };
    case 'restAdjusted': {
      if (state !== 'resting' || !session.restEndsAt) return session;
      const adjusted = Date.parse(session.restEndsAt) + event.deltaSec * 1000;
      const restEndsAt = new Date(Math.max(Date.parse(now), adjusted)).toISOString();
      return { ...session, restEndsAt, updatedAt: now };
    }
    case 'finish':
      if (state !== 'active' && state !== 'resting') return session;
      return { ...withoutRest(session), state: 'finished', finishedAt: now, updatedAt: now };
  }
}

export function isOpen(session: Session): boolean {
  return session.state !== 'finished' && session.deletedAt === null;
}

/** An open session older than 12 hours (from startedAt, or createdAt when notStarted). */
export function isStale(session: Session, now: Iso): boolean {
  if (!isOpen(session)) return false;
  const from = session.state === 'notStarted' ? session.createdAt : session.startedAt;
  if (!from) return false;
  return Date.parse(now) - Date.parse(from) > STALE_AFTER_MS;
}

import type { Iso, Session, SetRecord } from '../db/types';

export const USAGE_WINDOW_DAYS = 28;

export interface UsageSummary {
  activeDays: number;
  sessions: number;
  sets: number;
  setsPerSession: number;
}

/** Usage over the 28 days before `now`, excluding deleted rows and notStarted sessions. */
export function usageSummary(sessions: Session[], sets: SetRecord[], now: Iso): UsageSummary {
  const end = Date.parse(now);
  const start = end - USAGE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const inWindow = (iso: Iso | undefined) => {
    if (!iso) return false;
    const t = Date.parse(iso);
    return t > start && t <= end;
  };

  const counted = sessions.filter(
    (s) => s.deletedAt === null && s.state !== 'notStarted' && inWindow(s.startedAt),
  );
  const countedSets = sets.filter((s) => s.deletedAt === null && inWindow(s.loggedAt));
  const days = new Set(counted.map((s) => (s.startedAt as Iso).slice(0, 10)));

  return {
    activeDays: days.size,
    sessions: counted.length,
    sets: countedSets.length,
    setsPerSession:
      counted.length === 0 ? 0 : Math.round((countedSets.length / counted.length) * 10) / 10,
  };
}

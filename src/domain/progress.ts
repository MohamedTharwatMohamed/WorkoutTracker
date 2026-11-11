import type { Iso, MuscleGroup, Session, SetRecord } from '../db/types';
import { MUSCLE_GROUPS } from '../db/types';
import type { Point } from './trends';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Weekly working sets per muscle group that most guidelines suggest for growth. */
export const WEEKLY_SET_TARGET = { low: 10, high: 20 } as const;

const live = <T extends { deletedAt: Iso | null }>(rows: T[]) => rows.filter((r) => r.deletedAt === null);

export function volumeKg(sets: SetRecord[]): number {
  return Math.round(live(sets).reduce((sum, s) => sum + s.reps * s.weightKg, 0));
}

/** Sets per muscle group; sets on unknown machines are ignored. */
export function setsByMuscle(
  sets: SetRecord[],
  groupOf: (machineId: string) => MuscleGroup | undefined,
): Record<MuscleGroup, number> {
  const out = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0])) as Record<MuscleGroup, number>;
  for (const s of live(sets)) {
    const g = groupOf(s.machineId);
    if (g) out[g] += 1;
  }
  return out;
}

export interface WeekActivity {
  /** Start of the 7-day window (exclusive). */
  start: Iso;
  sessions: number;
  sets: number;
  volumeKg: number;
}

/** Rolling 7-day windows ending at `now`, oldest first. Ignores notStarted sessions. */
export function weeklyActivity(sessions: Session[], sets: SetRecord[], now: Iso, weeks: number): WeekActivity[] {
  const end = Date.parse(now);
  const counted = live(sessions).filter((s) => s.state !== 'notStarted' && s.startedAt);
  const liveSets = live(sets);
  return Array.from({ length: weeks }, (_, i) => {
    const to = end - (weeks - 1 - i) * 7 * DAY_MS;
    const from = to - 7 * DAY_MS;
    const inside = (iso: Iso) => {
      const t = Date.parse(iso);
      return t > from && t <= to;
    };
    const weekSets = liveSets.filter((s) => inside(s.loggedAt));
    return {
      start: new Date(from).toISOString(),
      sessions: counted.filter((s) => inside(s.startedAt as Iso)).length,
      sets: weekSets.length,
      volumeKg: volumeKg(weekSets),
    };
  });
}

/** Consecutive weeks, counting back from the latest, with at least one session. */
export function weekStreak(weeks: WeekActivity[]): number {
  let streak = 0;
  for (let i = weeks.length - 1; i >= 0 && (weeks[i]?.sessions ?? 0) > 0; i--) streak++;
  return streak;
}

/** Heaviest weight lifted on a machine in each session, oldest first. */
export function strengthSeries(sets: SetRecord[], machineId: string): Point[] {
  const best = new Map<string, Point>();
  for (const s of live(sets)) {
    if (s.machineId !== machineId) continue;
    const prev = best.get(s.sessionId);
    if (!prev || s.weightKg > prev.value) best.set(s.sessionId, { date: s.loggedAt, value: s.weightKg });
  }
  return [...best.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export interface StrengthChange {
  machineId: string;
  sessions: number;
  firstKg: number;
  bestKg: number;
  latestKg: number;
}

/** Per machine: first, best and latest top weight, most trained machines first. */
export function strengthChanges(sets: SetRecord[]): StrengthChange[] {
  const ids = [...new Set(live(sets).map((s) => s.machineId))];
  return ids
    .map((machineId) => {
      const points = strengthSeries(sets, machineId);
      return {
        machineId,
        sessions: points.length,
        firstKg: points[0]?.value ?? 0,
        bestKg: Math.max(...points.map((p) => p.value)),
        latestKg: points.at(-1)?.value ?? 0,
      };
    })
    .sort((a, b) => b.sessions - a.sessions || b.bestKg - a.bestKg);
}

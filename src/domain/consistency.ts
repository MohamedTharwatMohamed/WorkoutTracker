import type { JournalEntry, SetRecord } from '../db/types';

export interface ConsistencyReport {
  missing: string[];
  wronglyDeleted: string[];
  wronglyLive: string[];
}

/** `sets` must include soft-deleted rows. The last journal entry per set decides. */
export function checkConsistency(journal: JournalEntry[], sets: SetRecord[]): ConsistencyReport {
  const lastBySet = new Map<string, JournalEntry>();
  for (const entry of [...journal].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))) {
    lastBySet.set(entry.entityId, entry);
  }
  const setsById = new Map(sets.map((s) => [s.id, s]));
  const report: ConsistencyReport = { missing: [], wronglyDeleted: [], wronglyLive: [] };

  for (const [id, entry] of lastBySet) {
    const set = setsById.get(id);
    if (!set) {
      report.missing.push(id);
      continue;
    }
    const expectDeleted = entry.type === 'set.deleted';
    const isDeleted = set.deletedAt !== null;
    if (expectDeleted && !isDeleted) report.wronglyLive.push(id);
    if (!expectDeleted && isDeleted) report.wronglyDeleted.push(id);
  }
  return report;
}

export function isClean(report: ConsistencyReport): boolean {
  return (
    report.missing.length === 0 &&
    report.wronglyDeleted.length === 0 &&
    report.wronglyLive.length === 0
  );
}

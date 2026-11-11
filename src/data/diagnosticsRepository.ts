import type { ErrorEntry, JournalEntry, SetRecord } from '../db/types';
import { db, visible, type ReadOptions } from './internal';

/** Row counts per table, including soft-deleted rows. */
export async function counts(): Promise<Record<string, number>> {
  const d = db();
  const entries = await Promise.all(
    d.tables.map(async (table) => [table.name, await table.count()] as const),
  );
  return Object.fromEntries(entries);
}

export function journal(): Promise<JournalEntry[]> {
  return db().journal.orderBy('seq').toArray();
}

export function errors(): Promise<ErrorEntry[]> {
  return db().errors.orderBy('seq').toArray();
}

export async function allSets(options: ReadOptions = {}): Promise<SetRecord[]> {
  return visible(await db().sets.toArray(), options);
}

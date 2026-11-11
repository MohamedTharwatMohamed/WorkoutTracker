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

/** Adds an error row and deletes the oldest rows above `keep`. */
export async function addError(entry: ErrorEntry, keep: number): Promise<void> {
  const d = db();
  await d.transaction('rw', d.errors, async () => {
    await d.errors.add(entry);
    const excess = (await d.errors.count()) - keep;
    if (excess > 0) {
      await d.errors.bulkDelete(await d.errors.orderBy('seq').limit(excess).primaryKeys());
    }
  });
}

export async function allSets(options: ReadOptions = {}): Promise<SetRecord[]> {
  return visible(await db().sets.toArray(), options);
}

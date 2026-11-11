import type { MetaEntry, MetaKey } from '../db/types';
import { countRows } from '../db/open';
import { writeMarker } from '../platform/storage';
import { db, deviceId } from './internal';

export type ExportState = 'completed' | 'started';

export function getDeviceId(): Promise<string> {
  return deviceId();
}

export async function get(key: MetaKey): Promise<MetaEntry['value'] | undefined> {
  return (await db().meta.get(key))?.value;
}

export async function set(key: MetaKey, value: MetaEntry['value']): Promise<void> {
  await db().meta.put({ key, value });
}

/** Rows changed since the last export, including soft-deleted ones. */
export async function changesSinceExport(): Promise<{ sets: number; total: number }> {
  const d = db();
  const last = await get('lastExportAt');
  const indexed = [d.sets, d.sessions, d.measurements, d.machines, d.machineSettings, d.routines, d.photos];
  const counts = await Promise.all(
    indexed.map((table) =>
      typeof last === 'string' ? table.where('updatedAt').above(last).count() : table.count(),
    ),
  );
  const profiles = await d.profile.toArray();
  const profileChanges = profiles.filter((p) => typeof last !== 'string' || p.updatedAt > last).length;
  const sets = counts[0] ?? 0;
  return { sets, total: counts.reduce((a, b) => a + b, 0) + profileChanges };
}

/** Records current row counts so a later launch can detect cleared storage. */
export async function rememberCounts(): Promise<void> {
  writeMarker(await countRows(db()));
}
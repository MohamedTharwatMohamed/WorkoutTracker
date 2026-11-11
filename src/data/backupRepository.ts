import type { MetaKey, Photo } from '../db/types';
import type { BackupData } from '../domain/backup/format';
import { db } from './internal';

export interface StoredBackup {
  data: BackupData;
  photos: Photo[];
}

const KEPT_META: readonly MetaKey[] = ['deviceId', 'installedAt', 'lastExportAt', 'lastExportState'];

/** Everything a backup holds, including soft-deleted rows. Photos stay as Blobs. */
export async function readAll(): Promise<StoredBackup> {
  const d = db();
  return d.transaction(
    'r',
    [d.profile, d.machines, d.machineSettings, d.routines, d.sessions, d.sets, d.measurements, d.photos],
    async () => ({
      data: {
        profile: (await d.profile.get('me')) ?? null,
        machines: await d.machines.toArray(),
        machineSettings: await d.machineSettings.toArray(),
        routines: await d.routines.toArray(),
        sessions: await d.sessions.toArray(),
        sets: await d.sets.toArray(),
        measurements: await d.measurements.toArray(),
      },
      photos: await d.photos.toArray(),
    }),
  );
}

/** Replaces all user data in one transaction. If anything fails, nothing changes. */
export async function replaceAll({ data, photos }: StoredBackup): Promise<void> {
  const d = db();
  await d.transaction('rw', d.tables, async () => {
    const tables = [
      d.profile,
      d.machines,
      d.machineSettings,
      d.routines,
      d.sessions,
      d.sets,
      d.measurements,
      d.photos,
      d.journal,
    ];
    await Promise.all(tables.map((t) => t.clear()));
    if (data.profile) await d.profile.add(data.profile);
    await d.machines.bulkAdd(data.machines);
    await d.machineSettings.bulkAdd(data.machineSettings);
    await d.routines.bulkAdd(data.routines);
    await d.sessions.bulkAdd(data.sessions);
    await d.sets.bulkAdd(data.sets);
    await d.measurements.bulkAdd(data.measurements);
    await d.photos.bulkAdd(photos);

    const at = new Date().toISOString();
    await d.journal.bulkAdd(
      data.sets
        .filter((s) => s.deletedAt === null)
        .map((s) => ({ at, type: 'set.created' as const, entityId: s.id, sessionId: s.sessionId })),
    );

    const stale = (await d.meta.toCollection().primaryKeys()).filter((k) => !KEPT_META.includes(k));
    await d.meta.bulkDelete(stale);
  });
}

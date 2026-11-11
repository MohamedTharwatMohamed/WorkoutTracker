import type { WorkoutDb } from './schema';

/** Returns this device's ID, creating it (and installedAt) on first use. */
export async function ensureDeviceId(db: WorkoutDb): Promise<string> {
  return db.transaction('rw', db.meta, async () => {
    const existing = await db.meta.get('deviceId');
    if (existing && typeof existing.value === 'string') return existing.value;
    const id = crypto.randomUUID();
    await db.meta.put({ key: 'deviceId', value: id });
    if (!(await db.meta.get('installedAt'))) {
      await db.meta.put({ key: 'installedAt', value: new Date().toISOString() });
    }
    return id;
  });
}

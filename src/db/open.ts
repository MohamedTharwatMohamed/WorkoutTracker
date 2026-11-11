import Dexie from 'dexie';
import { SCHEMA_VERSION } from '../buildInfo';
import { readMarker, writeMarker, type MarkerCounts } from '../platform/storage';
import { setDb } from './current';
import { ensureDeviceId } from './meta';
import { DB_NAME, WorkoutDb } from './schema';
import * as snapshot from './snapshot';

export type OpenResult =
  | { kind: 'ok'; db: WorkoutDb }
  | { kind: 'cleared'; db: WorkoutDb }
  | { kind: 'failed'; error: unknown };

export type DbAlert = 'versionchange' | 'blocked';

let alertListener: ((alert: DbAlert) => void) | null = null;

/** The UI subscribes to show "reload" (versionchange) or "close other tabs" (blocked). */
export function onDbAlert(listener: ((alert: DbAlert) => void) | null): void {
  alertListener = listener;
}

/** Returns the stored Dexie version (verno), or null for a new install. */
async function storedVersion(): Promise<number | null> {
  const probe = new Dexie(DB_NAME);
  try {
    await probe.open();
    return probe.verno;
  } catch (error) {
    if (error instanceof Dexie.NoSuchDatabaseError) return null;
    throw error;
  } finally {
    probe.close();
  }
}

export async function countRows(db: WorkoutDb): Promise<MarkerCounts> {
  const [sets, sessions, measurements] = await Promise.all([
    db.sets.count(),
    db.sessions.count(),
    db.measurements.count(),
  ]);
  return { sets, sessions, measurements };
}

const isEmpty = (c: MarkerCounts) => c.sets === 0 && c.sessions === 0 && c.measurements === 0;

export async function openDatabase(
  options: { create?: () => WorkoutDb; schemaVersion?: number } = {},
): Promise<OpenResult> {
  const create = options.create ?? (() => new WorkoutDb());
  const target = options.schemaVersion ?? SCHEMA_VERSION;
  try {
    const stored = await storedVersion();
    if (stored !== null && stored > target) {
      // Dexie 4 would open a newer database anyway; the app must not touch it.
      throw new Dexie.VersionError(`Database version ${stored} is newer than the app (${target})`);
    }
    if (stored !== null && stored < target) await snapshot.save(stored);

    const db = create();
    db.on('versionchange', () => {
      db.close();
      alertListener?.('versionchange');
      return false;
    });
    db.on('blocked', () => alertListener?.('blocked'));
    await db.open();
    setDb(db);

    await ensureDeviceId(db);
    await db.meta.put({ key: 'schemaVersion', value: target });

    const counts = await countRows(db);
    const marker = readMarker();
    const dropped =
      marker !== null &&
      (counts.sets < marker.sets ||
        counts.sessions < marker.sessions ||
        counts.measurements < marker.measurements);
    if (marker && (isEmpty(counts) || dropped)) return { kind: 'cleared', db };
    if (!isEmpty(counts)) writeMarker(counts);
    return { kind: 'ok', db };
  } catch (error) {
    return { kind: 'failed', error };
  }
}

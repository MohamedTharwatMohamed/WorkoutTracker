import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDb, setDb } from './current';
import { onDbAlert, openDatabase } from './open';
import { DB_NAME, WorkoutDb } from './schema';
import * as snapshot from './snapshot';
import { MARKER_KEY, readMarker, writeMarker } from '../platform/storage';
import seed from '../test/fixtures/db-v1-seed.json';

/** Test-only next schema version, to exercise the upgrade path. */
class WorkoutDbV2 extends WorkoutDb {
  constructor() {
    super();
    this.version(2).stores({ extra: 'id' });
  }
}

async function seedV1(): Promise<void> {
  const db = new WorkoutDb();
  await db.open();
  for (const [table, rows] of Object.entries(seed)) await db.table(table).bulkAdd(rows);
  db.close();
}

async function ok(result: Awaited<ReturnType<typeof openDatabase>>) {
  if (result.kind === 'failed') throw result.error;
  return result;
}

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  setDb(null);
  onDbAlert(null);
});

describe('openDatabase', () => {
  it('new install: no snapshot, device ID created, no marker', async () => {
    const result = await ok(await openDatabase());
    expect(result.kind).toBe('ok');
    expect(getDb()).toBe(result.db);
    expect(await snapshot.list()).toEqual([]);
    expect(await result.db.meta.get('deviceId')).toBeDefined();
    expect(await result.db.meta.get('installedAt')).toBeDefined();
    expect(readMarker()).toBeNull();
  });

  it('writes the marker on a normal launch with data', async () => {
    await seedV1();
    expect((await ok(await openDatabase())).kind).toBe('ok');
    expect(readMarker()).toEqual({ sets: 2, sessions: 1, measurements: 1 });
    expect(await snapshot.list()).toEqual([]);
  });

  it('takes a snapshot before an upgrade', async () => {
    await seedV1();
    const result = await ok(await openDatabase({ create: () => new WorkoutDbV2(), schemaVersion: 2 }));
    expect(result.kind).toBe('ok');
    expect(result.db.verno).toBe(2);
    const snaps = await snapshot.list();
    expect(snaps).toHaveLength(1);
    expect(snaps[0]?.fromVersion).toBe(1);
    // Data survives the upgrade.
    expect(await result.db.sets.count()).toBe(2);
  });

  it('returns cleared when the marker exists and the database is empty', async () => {
    writeMarker({ sets: 2, sessions: 1, measurements: 1 });
    expect((await openDatabase()).kind).toBe('cleared');
    expect(localStorage.getItem(MARKER_KEY)).not.toBeNull();
  });

  it('returns cleared when any count dropped', async () => {
    await seedV1();
    writeMarker({ sets: 5, sessions: 1, measurements: 1 });
    expect((await openDatabase()).kind).toBe('cleared');
  });

  it('returns failed on VersionError (database newer than the app)', async () => {
    const newer = new Dexie(DB_NAME);
    newer.version(3).stores({ x: 'id' });
    await newer.open();
    newer.close();
    const result = await openDatabase();
    expect(result.kind).toBe('failed');
    expect((result as { error: Error }).error.name).toBe('VersionError');
  });

  it('closes on versionchange and tells the UI', async () => {
    const alerts: string[] = [];
    onDbAlert((a) => alerts.push(a));
    const { db } = await ok(await openDatabase());
    const other = new WorkoutDbV2();
    await other.open();
    expect(alerts).toEqual(['versionchange']);
    expect(db.isOpen()).toBe(false);
    other.close();
  });

  it('reports blocked when another connection does not close', async () => {
    const alerts: string[] = [];
    onDbAlert((a) => alerts.push(a));
    const raw = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 10);
      req.onupgradeneeded = () => {
        for (const name of ['profile', 'machines', 'machineSettings', 'photos', 'routines', 'sessions', 'sets', 'measurements', 'meta']) {
          req.result.createObjectStore(name, { keyPath: name === 'meta' ? 'key' : name === 'machineSettings' ? 'machineId' : 'id' });
        }
        for (const name of ['journal', 'errors']) {
          req.result.createObjectStore(name, { keyPath: 'seq', autoIncrement: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    raw.onversionchange = () => {
      // Simulates another tab that ignores the request, then closes a moment later.
      setTimeout(() => raw.close(), 50);
    };
    const result = openDatabase({ create: () => new WorkoutDbV2(), schemaVersion: 2 });
    await vi.waitFor(() => expect(alerts).toContain('blocked'));
    expect((await result).kind).toBe('ok');
  });
});

import Dexie, { type Table } from 'dexie';
import type { Iso } from './types';
import { DB_NAME } from './schema';
import { bytesToBase64 } from '../domain/backup/base64';
import { shareOrDownload, type ShareResult } from '../platform/share';

export const SNAPSHOT_DB_NAME = 'workout-tracker-snapshots';
export const SNAPSHOTS_KEPT = 2;

export interface SnapshotRecord {
  seq?: number;
  createdAt: Iso;
  fromVersion: number;
  tables: Record<string, unknown[]>;
}

class SnapshotDb extends Dexie {
  snapshots!: Table<SnapshotRecord, number>;
  constructor() {
    super(SNAPSHOT_DB_NAME);
    this.version(1).stores({ snapshots: '++seq, createdAt' });
  }
}

async function withSnapshotDb<T>(fn: (db: SnapshotDb) => Promise<T>): Promise<T> {
  const db = new SnapshotDb();
  try {
    return await fn(db);
  } finally {
    db.close();
  }
}

/** Reads every object store of the app database with raw IndexedDB, whatever its version. */
export function readRaw(): Promise<Record<string, unknown[]>> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    let isNew = false;
    request.onupgradeneeded = () => {
      // The database did not exist; abort so nothing is created.
      isNew = true;
      request.transaction?.abort();
    };
    request.onerror = () => (isNew ? resolve({}) : reject(request.error));
    request.onsuccess = () => {
      const db = request.result;
      const names = Array.from(db.objectStoreNames);
      if (names.length === 0) {
        db.close();
        resolve({});
        return;
      }
      const tables: Record<string, unknown[]> = {};
      const tx = db.transaction(names, 'readonly');
      for (const name of names) {
        const get = tx.objectStore(name).getAll();
        get.onsuccess = () => {
          tables[name] = get.result;
        };
      }
      tx.oncomplete = () => {
        db.close();
        resolve(tables);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
  });
}

export async function save(fromVersion: number): Promise<void> {
  const tables = await readRaw();
  await withSnapshotDb(async (db) => {
    await db.snapshots.add({ createdAt: new Date().toISOString(), fromVersion, tables });
    const keys = await db.snapshots.orderBy('seq').primaryKeys();
    const old = keys.slice(0, Math.max(0, keys.length - SNAPSHOTS_KEPT));
    await db.snapshots.bulkDelete(old);
  });
}

export function list(): Promise<{ seq: number; createdAt: Iso; fromVersion: number }[]> {
  return withSnapshotDb(async (db) =>
    (await db.snapshots.orderBy('seq').toArray()).map((s) => ({
      seq: s.seq as number,
      createdAt: s.createdAt,
      fromVersion: s.fromVersion,
    })),
  );
}

async function encodeValue(value: unknown): Promise<unknown> {
  if (value instanceof Blob) {
    return { mime: value.type, base64: bytesToBase64(new Uint8Array(await value.arrayBuffer())) };
  }
  if (Array.isArray(value)) return Promise.all(value.map(encodeValue));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = await encodeValue(v);
    return out;
  }
  return value;
}

/** Builds a raw support file (not importable). Blobs become base64. */
export async function buildRawFile(tables: Record<string, unknown[]>, createdAt: Iso): Promise<File> {
  const body = {
    format: 'workout-tracker-raw',
    createdAt,
    tables: await encodeValue(tables),
  };
  const stamp = createdAt.replace(/[:.]/g, '-');
  return new File([JSON.stringify(body)], `workout-raw-${stamp}.json`, {
    type: 'application/json',
  });
}

export async function exportRaw(): Promise<ShareResult> {
  return shareOrDownload(await buildRawFile(await readRaw(), new Date().toISOString()));
}

export async function exportSnapshot(seq: number): Promise<ShareResult> {
  const snapshot = await withSnapshotDb((db) => db.snapshots.get(seq));
  if (!snapshot) throw new Error(`Snapshot ${seq} not found`);
  return shareOrDownload(await buildRawFile(snapshot.tables, snapshot.createdAt));
}

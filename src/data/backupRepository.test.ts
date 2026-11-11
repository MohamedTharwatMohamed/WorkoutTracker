import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkoutDb } from '../db/schema';
import { checkConsistency, isClean } from '../domain/consistency';
import type { BackupData } from '../domain/backup/format';
import golden from '../test/fixtures/backup-golden.json';
import { T0, makeProfile } from '../test/factories';
import { freshDb } from '../test/db';
import * as backupRepository from './backupRepository';
import * as diagnosticsRepository from './diagnosticsRepository';
import * as metaRepository from './metaRepository';
import * as profileRepository from './profileRepository';
import * as sessionRepository from './sessionRepository';
import * as setRepository from './setRepository';

let db: WorkoutDb;
const goldenData = () => structuredClone(golden.data) as unknown as BackupData;

async function seedOldData() {
  await profileRepository.save(makeProfile({ heightCm: 150 }));
  const s = await sessionRepository.create();
  await sessionRepository.transition(s.id, { type: 'start' });
  await setRepository.add({ sessionId: s.id, machineId: 'old', setNumber: 1, reps: 1, weightKg: 1 }, 60);
  await db.errors.add({ at: T0, kind: 'test', message: 'kept' });
  await metaRepository.set('lastExportAt', T0);
  await metaRepository.set('lastExportState', 'completed');
  await metaRepository.set('schemaVersion', 1);
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(T0));
  db = await freshDb();
});
afterEach(() => vi.useRealTimers());

describe('backupRepository', () => {
  it('readAll returns every row, including deleted ones, with photo Blobs', async () => {
    await seedOldData();
    const sets = await db.sets.toArray();
    await setRepository.softDelete(sets[0]!.id);
    const photo = new Blob([new Uint8Array([1])], { type: 'image/webp' });
    await db.photos.add({ id: 'p', blob: photo, mime: 'image/webp', createdAt: T0, updatedAt: T0, deletedAt: null, deviceId: 'd' });
    const { data, photos } = await backupRepository.readAll();
    expect(data.profile?.heightCm).toBe(150);
    expect(data.sets).toHaveLength(1);
    expect(data.sets[0]?.deletedAt).toBe(T0);
    expect(photos).toHaveLength(1);
  });

  it('replaceAll swaps data, re-seeds the journal and keeps errors and device meta', async () => {
    await seedOldData();
    const deviceId = await metaRepository.getDeviceId();
    const installedAt = await metaRepository.get('installedAt');

    await backupRepository.replaceAll({ data: goldenData(), photos: [] });

    expect((await profileRepository.get())?.heightCm).toBe(178);
    expect((await db.sets.toArray()).map((s) => s.id).sort()).toEqual(golden.data.sets.map((s) => s.id).sort());
    const journal = await diagnosticsRepository.journal();
    expect(journal).toEqual([
      expect.objectContaining({ type: 'set.created', entityId: golden.data.sets[0]!.id }),
    ]);
    expect(isClean(checkConsistency(journal, await diagnosticsRepository.allSets({ includeDeleted: true })))).toBe(true);
    expect(await diagnosticsRepository.errors()).toHaveLength(1);
    expect(await metaRepository.getDeviceId()).toBe(deviceId);
    expect(await metaRepository.get('installedAt')).toBe(installedAt);
    expect(await metaRepository.get('lastExportAt')).toBe(T0);
    expect(await metaRepository.get('lastExportState')).toBe('completed');
    expect(await metaRepository.get('schemaVersion')).toBeUndefined();
    expect((await db.sets.get(golden.data.sets[0]!.id))?.deviceId).toBe('dev-golden');
  });

  it('replaceAll leaves old data unchanged when it fails halfway', async () => {
    await seedOldData();
    const before = await backupRepository.readAll();
    const journalBefore = await diagnosticsRepository.journal();
    const data = goldenData();
    data.measurements.push({ ...data.measurements[0]! });

    await expect(backupRepository.replaceAll({ data, photos: [] })).rejects.toThrow();

    expect(await backupRepository.readAll()).toEqual(before);
    expect(await diagnosticsRepository.journal()).toEqual(journalBefore);
    expect(await metaRepository.get('schemaVersion')).toBe(1);
  });

  it('replaceAll handles a null profile', async () => {
    await seedOldData();
    await backupRepository.replaceAll({ data: { ...goldenData(), profile: null }, photos: [] });
    expect(await profileRepository.get()).toBeUndefined();
  });

  it('diagnostics counts include every table and deleted rows', async () => {
    await seedOldData();
    const counts = await diagnosticsRepository.counts();
    expect(counts).toMatchObject({ sets: 1, sessions: 1, errors: 1, journal: 1, profile: 1 });
    expect(await diagnosticsRepository.allSets()).toHaveLength(1);
  });
});

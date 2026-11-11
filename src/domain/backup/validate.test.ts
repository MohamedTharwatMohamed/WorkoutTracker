import { describe, expect, it } from 'vitest';
import backupV1 from '../../test/fixtures/backup-v1.json';
import golden from '../../test/fixtures/backup-golden.json';
import { base64ToBytes, bytesToBase64 } from './base64';
import { buildBackup } from './build';
import type { BackupData, BackupFile, BackupPhoto } from './format';
import { upgradeBackup } from './upgrade';
import { validateBackup } from './validate';

const meta = { appBuild: 'test', deviceId: 'dev', exportedAt: '2025-01-05T00:00:00.000Z' };

async function goldenFile(): Promise<BackupFile> {
  const data = { ...structuredClone(golden.data), plans: [] } as unknown as BackupData;
  return buildBackup(data, structuredClone(golden.photos) as BackupPhoto[], meta);
}

/** Round-trips through JSON, as a real file would. */
const asJson = (file: unknown): unknown => JSON.parse(JSON.stringify(file));

async function errorsOf(json: unknown): Promise<string[]> {
  const result = await validateBackup(json);
  return result.ok ? [] : result.errors;
}

describe('validateBackup', () => {
  it('accepts a freshly built file (round trip)', async () => {
    const file = await goldenFile();
    const result = await validateBackup(asJson(file));
    expect(result).toEqual({ ok: true, file: asJson(file) });
  });

  it('accepts the stored version-1 file fixture and reads it with no plans', async () => {
    const result = await validateBackup(backupV1);
    expect(result.ok && result.file.data.plans).toEqual([]);
    expect(result.ok && result.file.manifest.counts.plans).toBe(0);
  });

  it('checks custom plans', async () => {
    const plan = {
      id: 'my-1',
      createdAt: meta.exportedAt,
      updatedAt: meta.exportedAt,
      deletedAt: null,
      deviceId: 'dev',
      name: 'Mine',
      tagline: '',
      description: '',
      goal: 'muscle',
      level: 'beginner',
      daysPerWeek: 2,
      minutes: 45,
      days: [{ name: 'A', items: [{ machineId: 'm1', targetSets: 3, targetReps: 10, scheme: 'pyramid' }] }],
    };
    const good = await goldenFile();
    good.data.plans = [plan as never];
    expect(await errorsOf(asJson(await buildBackup(good.data, good.photos, meta)))).toEqual([]);
    good.data.plans = [{ ...plan, goal: 'fly' } as never];
    expect(await errorsOf(asJson(await buildBackup(good.data, good.photos, meta)))).toEqual([
      'data.plans[0]: bad field "goal"',
    ]);
  });

  it('rejects other files', async () => {
    expect(await errorsOf(null)).toEqual(['Not a Workout Tracker backup file']);
    expect(await errorsOf({ format: 'other' })).toEqual(['Not a Workout Tracker backup file']);
    expect(await errorsOf({ format: 'workout-tracker-backup' })).toEqual(['Missing format version']);
  });

  it('rejects a newer format version', async () => {
    const file = { ...(await goldenFile()), formatVersion: 99 };
    expect(await errorsOf(asJson(file))).toEqual(['Made by a newer app version; update first']);
  });

  it('detects a checksum mismatch', async () => {
    const file = asJson(await goldenFile()) as BackupFile;
    (file.data.sets[0] as { reps: number }).reps = 11;
    expect(await errorsOf(file)).toEqual(['Checksum mismatch: the file is damaged or was edited']);
  });

  it('detects a count mismatch', async () => {
    const file = asJson(await goldenFile()) as BackupFile;
    file.manifest.counts.sets = 5;
    expect(await errorsOf(file)).toContain('Count mismatch for sets');
  });

  it('reports bad and missing fields', async () => {
    const file = asJson(await goldenFile()) as BackupFile;
    (file.data.sets[0] as unknown as Record<string, unknown>).weightKg = '40';
    delete (file.data.measurements[0] as unknown as Record<string, unknown>).side;
    (file as unknown as Record<string, unknown>).exportedAt = 'nope';
    const errors = await errorsOf(file);
    expect(errors).toContain('data.sets[0]: bad field "weightKg"');
    expect(errors).toContain('data.measurements[0]: bad field "side"');
    expect(errors).toContain('field "exportedAt"');
  });

  it('reports duplicate IDs', async () => {
    const file = asJson(await goldenFile()) as BackupFile;
    file.data.sets[1] = { ...file.data.sets[1]!, id: file.data.sets[0]!.id };
    file.photos.push({ ...file.photos[0]! });
    const errors = await errorsOf(file);
    expect(errors).toContain(`data.sets: duplicate ID ${file.data.sets[0]!.id}`);
    expect(errors).toContain(`photos: duplicate ID ${file.photos[0]!.id}`);
  });

  it('reports non-list tables, bad photos and a missing data object', async () => {
    const file = asJson(await goldenFile()) as Record<string, unknown>;
    const data = file.data as Record<string, unknown>;
    data.sets = {};
    data.profile = 'me';
    (file.photos as unknown[]).push({ id: 'p', mime: 'image/png', base64: '' });
    const errors = await errorsOf(file);
    expect(errors).toContain('data.sets is not a list');
    expect(errors).toContain('data.profile is not an object');
    expect(errors).toContain('photos[1]: bad photo');
    expect(await errorsOf({ ...file, data: undefined })).toContain('field "data"');
  });

  it('accepts a null profile', async () => {
    const data = { ...(structuredClone(golden.data) as unknown as BackupData), profile: null };
    const file = await buildBackup(data, [], meta);
    expect((await validateBackup(asJson(file))).ok).toBe(true);
  });
});

describe('upgradeBackup', () => {
  it('returns version-1 files unchanged', () => {
    const file = { formatVersion: 1, x: 1 };
    expect(upgradeBackup(file, 1)).toEqual(file);
  });
});

describe('base64', () => {
  it('round-trips bytes', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255, 128]);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
    expect(bytesToBase64(new TextEncoder().encode('abc'))).toBe('YWJj');
  });
});

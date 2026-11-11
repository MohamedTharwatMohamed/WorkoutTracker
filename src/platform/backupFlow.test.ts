import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as metaRepository from '../data/metaRepository';
import type { WorkoutDb } from '../db/schema';
import { validateBackup } from '../domain/backup/validate';
import { T0, at, makeSession, makeSet } from '../test/factories';
import { freshDb } from '../test/db';
import backupV1 from '../test/fixtures/backup-v1.json?raw';
import { readMarker } from './storage';

vi.mock('./share', () => ({ shareOrDownload: vi.fn() }));
const { shareOrDownload } = await import('./share');
const { ImportCancelledError, confirmImport, exportBackup, importBackup } = await import('./backupFlow');
const share = vi.mocked(shareOrDownload);

let db: WorkoutDb;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(T0);
  db = await freshDb();
  share.mockReset();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  db.close();
});

async function seedCurrentData() {
  await db.sessions.add(makeSession({ state: 'finished', startedAt: at(-600) }));
  await db.sets.add(makeSet({ id: 'current-set' }));
}

const v1File = () => new File([backupV1], 'backup.json', { type: 'application/json' });

describe('exportBackup', () => {
  it('shares a valid backup and records completed', async () => {
    await seedCurrentData();
    const photo = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' });
    await db.photos.bulkAdd([
      { id: 'p1', blob: photo, mime: 'image/webp', createdAt: T0, updatedAt: T0, deletedAt: null, deviceId: 'd' },
      { id: 'p2', blob: photo, mime: 'image/webp', createdAt: T0, updatedAt: T0, deletedAt: T0, deviceId: 'd' },
    ]);
    share.mockResolvedValue('shared');

    expect(await exportBackup()).toBe('shared');

    const file = share.mock.calls[0]?.[0] as File;
    expect(file.name).toMatch(/^workout-backup-.*\.json$/);
    const result = await validateBackup(JSON.parse(await file.text()));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.file.data.sets.map((s) => s.id)).toEqual(['current-set']);
      expect(result.file.photos).toEqual([{ id: 'p1', mime: 'image/webp', base64: 'AQID' }]);
    }
    expect(await metaRepository.get('lastExportAt')).toBe(T0);
    expect(await metaRepository.get('lastExportState')).toBe('completed');
  });

  it('records started for a download', async () => {
    share.mockResolvedValue('downloaded');
    await exportBackup();
    expect(await metaRepository.get('lastExportAt')).toBe(T0);
    expect(await metaRepository.get('lastExportState')).toBe('started');
  });

  it('records nothing when cancelled', async () => {
    share.mockResolvedValue('cancelled');
    await exportBackup();
    expect(await metaRepository.get('lastExportAt')).toBeUndefined();
    expect(await metaRepository.get('lastExportState')).toBeUndefined();
  });
});

describe('importBackup', () => {
  it('returns a preview of a valid file', async () => {
    const result = await importBackup(v1File());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.preview.counts).toMatchObject({ sets: 2, sessions: 1, photos: 1 });
      expect(result.preview.appBuild).toBe('fixture');
    }
  });

  it('rejects text that is not JSON and damaged files', async () => {
    expect(await importBackup(new File(['nope'], 'x.json'))).toEqual({
      ok: false,
      errors: ['The file is not valid JSON'],
    });
    const damaged = backupV1.replace(/"reps": \d+/, '"reps": 99');
    expect(damaged).not.toBe(backupV1);
    const result = await importBackup(new File([damaged], 'x.json'));
    expect(result).toMatchObject({ ok: false, errors: [expect.stringContaining('Checksum')] });
  });
});

describe('confirmImport', () => {
  async function preview() {
    const result = await importBackup(v1File());
    if (!result.ok) throw new Error('fixture invalid');
    return result.preview;
  }

  it.each([
    ['cancelled', () => share.mockResolvedValue('cancelled')],
    ['throws', () => share.mockRejectedValue(new Error('share failed'))],
  ])('stops when the pre-import export %s', async (_, arrange) => {
    await seedCurrentData();
    arrange();

    const promise = confirmImport(await preview());
    await expect(promise).rejects.toBeInstanceOf(ImportCancelledError);
    await expect(promise).rejects.toThrow('Import cancelled: the current data was not exported');
    expect((await db.sets.toArray()).map((s) => s.id)).toEqual(['current-set']);
  });

  it('exports first, then replaces the data and rewrites the marker', async () => {
    await seedCurrentData();
    share.mockResolvedValue('shared');

    await confirmImport(await preview());

    expect(share).toHaveBeenCalledOnce();
    expect(await db.sets.count()).toBe(2);
    expect(await db.sets.get('current-set')).toBeUndefined();
    const photos = await db.photos.toArray();
    expect(photos).toHaveLength(1);
    expect(photos[0]?.blob.type).toBe(photos[0]?.mime);
    expect(readMarker()).toEqual({ sets: 2, sessions: 1, measurements: 1 });
  });

  it('skips the pre-import export on an empty database', async () => {
    await confirmImport(await preview());

    expect(share).not.toHaveBeenCalled();
    expect(await db.sets.count()).toBe(2);
    expect(readMarker()).toEqual({ sets: 2, sessions: 1, measurements: 1 });
  });
});

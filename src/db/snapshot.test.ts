import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkoutDb } from './schema';
import * as snapshot from './snapshot';

vi.mock('../platform/share', () => ({
  shareOrDownload: vi.fn((file: File) => Promise.resolve(file.name.startsWith('workout-raw') ? 'downloaded' : 'x')),
}));
const { shareOrDownload } = await import('../platform/share');

afterEach(() => vi.mocked(shareOrDownload).mockClear());

async function seed(): Promise<void> {
  const db = new WorkoutDb();
  await db.open();
  await db.meta.put({ key: 'deviceId', value: 'd' });
  await db.photos.add({
    id: 'p',
    blob: new Blob([new Uint8Array([97, 98, 99])], { type: 'image/webp' }),
    mime: 'image/webp',
    createdAt: 't',
    updatedAt: 't',
    deletedAt: null,
    deviceId: 'd',
  });
  db.close();
}

describe('snapshot', () => {
  it('readRaw returns {} and creates nothing when there is no database', async () => {
    expect(await snapshot.readRaw()).toEqual({});
    expect(await indexedDB.databases()).toEqual([]);
  });

  it('readRaw reads every store', async () => {
    await seed();
    const tables = await snapshot.readRaw();
    expect(Object.keys(tables).sort()).toContain('photos');
    expect(tables.meta).toEqual([{ key: 'deviceId', value: 'd' }]);
  });

  it('save keeps only the newest 2 snapshots', async () => {
    await seed();
    for (let i = 0; i < 3; i++) await snapshot.save(1);
    const list = await snapshot.list();
    expect(list.map((s) => s.seq)).toEqual([2, 3]);
    expect(list[0]?.fromVersion).toBe(1);
  });

  it('builds raw files with photos as base64', async () => {
    const file = await snapshot.buildRawFile(
      { photos: [{ id: 'p', blob: new Blob([new Uint8Array([97, 98, 99])], { type: 'image/webp' }) }] },
      '2025-01-01T00:00:00.000Z',
    );
    expect(file.name).toBe('workout-raw-2025-01-01T00-00-00-000Z.json');
    expect(JSON.parse(await file.text())).toEqual({
      format: 'workout-tracker-raw',
      createdAt: '2025-01-01T00:00:00.000Z',
      tables: { photos: [{ id: 'p', blob: { mime: 'image/webp', base64: 'YWJj' } }] },
    });
  });

  it('exportRaw and exportSnapshot hand a file to shareOrDownload', async () => {
    await seed();
    expect(await snapshot.exportRaw()).toBe('downloaded');
    await snapshot.save(1);
    const [first] = await snapshot.list();
    expect(await snapshot.exportSnapshot(first!.seq)).toBe('downloaded');
    expect(shareOrDownload).toHaveBeenCalledTimes(2);
    await expect(snapshot.exportSnapshot(999)).rejects.toThrow('not found');
  });
});

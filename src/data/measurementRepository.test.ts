import { beforeEach, describe, expect, it } from 'vitest';
import type { WorkoutDb } from '../db/schema';
import { T0, at } from '../test/factories';
import { freshDb } from '../test/db';
import * as measurementRepository from './measurementRepository';

let db: WorkoutDb;
beforeEach(async () => {
  db = await freshDb();
});

describe('measurementRepository', () => {
  it('recent returns live rows across sites, newest first, up to the limit', async () => {
    await measurementRepository.add({ site: 'weight', value: 80, takenAt: at(0) });
    const gone = await measurementRepository.add({ site: 'waist', value: 85, takenAt: at(60) });
    await measurementRepository.add({ site: 'waist', value: 84, takenAt: at(120) });
    await measurementRepository.add({ site: 'hips', value: 99, takenAt: at(180) });
    await measurementRepository.softDelete(gone);
    expect((await measurementRepository.recent(2)).map((m) => m.value)).toEqual([99, 84]);
  });

  it('requires a side for arm, thigh and calf and rejects it elsewhere', async () => {
    for (const site of ['arm', 'thigh', 'calf'] as const) {
      await expect(measurementRepository.add({ site, value: 30, takenAt: T0 })).rejects.toThrow('needs a side');
      await measurementRepository.add({ site, side: 'left', value: 30, takenAt: T0 });
    }
    await expect(
      measurementRepository.add({ site: 'waist', side: 'left', value: 80, takenAt: T0 }),
    ).rejects.toThrow('has no side');
  });

  it('checks the side rule on the merged update', async () => {
    const id = await measurementRepository.add({ site: 'arm', side: 'left', value: 30, takenAt: T0 });
    await expect(measurementRepository.update(id, { side: undefined })).rejects.toThrow('needs a side');
    await expect(measurementRepository.update(id, { site: 'waist' })).rejects.toThrow('has no side');
    await measurementRepository.update(id, { site: 'waist', side: undefined, value: 81 });
    expect(await db.measurements.get(id)).toMatchObject({ site: 'waist', value: 81 });
    expect((await db.measurements.get(id))?.side).toBeUndefined();
    await expect(measurementRepository.update('nope', {})).rejects.toThrow('not found');
  });

  it('series returns one site and side, oldest first, without deleted rows', async () => {
    await measurementRepository.add({ site: 'weight', value: 80, takenAt: at(200) });
    const deleted = await measurementRepository.add({ site: 'weight', value: 1, takenAt: at(100) });
    await measurementRepository.add({ site: 'weight', value: 81, takenAt: T0 });
    await measurementRepository.add({ site: 'arm', side: 'left', value: 35, takenAt: T0 });
    await measurementRepository.add({ site: 'arm', side: 'right', value: 36, takenAt: T0 });
    await measurementRepository.softDelete(deleted);

    expect((await measurementRepository.series('weight')).map((m) => m.value)).toEqual([81, 80]);
    expect(await measurementRepository.series('weight', undefined, { includeDeleted: true })).toHaveLength(3);
    expect((await measurementRepository.series('arm', 'right')).map((m) => m.value)).toEqual([36]);
  });
});

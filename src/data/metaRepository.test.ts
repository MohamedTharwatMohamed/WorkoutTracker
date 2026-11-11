import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkoutDb } from '../db/schema';
import { T0, at, makeProfile } from '../test/factories';
import { freshDb } from '../test/db';
import * as metaRepository from './metaRepository';
import * as profileRepository from './profileRepository';
import * as routineRepository from './routineRepository';
import * as sessionRepository from './sessionRepository';
import * as setRepository from './setRepository';

let db: WorkoutDb;
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(T0));
  db = await freshDb();
});
afterEach(() => vi.useRealTimers());

describe('metaRepository', () => {
  it('creates the device ID once and stores values', async () => {
    const id = await metaRepository.getDeviceId();
    expect(await metaRepository.getDeviceId()).toBe(id);
    expect(await metaRepository.get('installedAt')).toBe(T0);
    await metaRepository.set('lastExportState', 'started');
    expect(await metaRepository.get('lastExportState')).toBe('started');
    expect(await metaRepository.get('lastExportAt')).toBeUndefined();
  });

  it('changesSinceExport counts every row without lastExportAt, then only newer ones', async () => {
    await profileRepository.save(makeProfile());
    const s = await sessionRepository.create();
    await sessionRepository.transition(s.id, { type: 'start' });
    const set = await setRepository.add({ sessionId: s.id, machineId: 'm', setNumber: 1, reps: 5, weightKg: 10 }, 60);
    // profile, routine, session, set
    expect(await metaRepository.changesSinceExport()).toEqual({ sets: 1, total: 4 });

    await metaRepository.set('lastExportAt', T0);
    expect(await metaRepository.changesSinceExport()).toEqual({ sets: 0, total: 0 });

    vi.setSystemTime(new Date(at(60)));
    await setRepository.softDelete(set.id);
    await routineRepository.removeItem('none');
    await profileRepository.save(makeProfile());
    expect(await metaRepository.changesSinceExport()).toEqual({ sets: 1, total: 4 });
    expect(await db.sets.count()).toBe(1);
  });
});

describe('profileRepository', () => {
  it('saves with updatedAt and deviceId', async () => {
    vi.setSystemTime(new Date(at(5)));
    await profileRepository.save(makeProfile({ heightCm: 170 }));
    const p = await profileRepository.get();
    expect(p).toMatchObject({ heightCm: 170, updatedAt: at(5), deviceId: await metaRepository.getDeviceId() });
  });
});

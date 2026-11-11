import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { catalogMachine, makeCatalog } from '../test/factories';
import { freshDb } from '../test/db';
import { loadCatalog, setCatalog } from './catalog';
import * as machineRepository from './machineRepository';

const catalog = makeCatalog([
  catalogMachine(),
  catalogMachine({ id: 'b-l-row', model: 'Seated Row', muscleGroup: 'back', aliases: [], defaultRestSec: 120 }),
  catalogMachine({ id: 'old', model: 'Old Press', retired: true }),
]);

beforeEach(async () => {
  await freshDb(catalog);
});

describe('machineRepository', () => {
  it('merges catalog, settings and custom machines', async () => {
    await machineRepository.updateSettings('b-l-row', { restSec: 60, weightStepKg: 2 });
    const id = await machineRepository.addCustom({
      name: 'Hack Squat',
      muscleGroup: 'legs',
      weightStepKg: 2.5,
      restSec: 150,
      aliases: ['hack'],
    });
    const all = await machineRepository.list();
    expect(all.map((m) => m.name)).toEqual(['Chest Press', 'Seated Row', 'Hack Squat']);
    expect(all[1]).toMatchObject({ settingsRestSec: 60, defaultRestSec: 120, weightStepKg: 2, ownStepKg: 2 });
    expect(all[0]).toMatchObject({ weightStepKg: 5, ownStepKg: undefined, custom: false });
    expect(all[2]).toMatchObject({ id, custom: true, customRestSec: 150, ownStepKg: 2.5 });
    expect(id).toMatch(/^custom-/);
  });

  it('searches name, brand and aliases and filters by muscle group', async () => {
    expect((await machineRepository.list({ query: 'BENCH' })).map((m) => m.id)).toEqual(['brand-line-chest-press']);
    expect((await machineRepository.list({ query: ' row ' })).map((m) => m.id)).toEqual(['b-l-row']);
    expect(await machineRepository.list({ query: 'brand' })).toHaveLength(2);
    expect((await machineRepository.list({ muscleGroup: 'back' })).map((m) => m.id)).toEqual(['b-l-row']);
  });

  it('hides hidden machines unless asked and always hides retired ones', async () => {
    await machineRepository.updateSettings('b-l-row', { hidden: true });
    expect((await machineRepository.list()).map((m) => m.id)).toEqual(['brand-line-chest-press']);
    expect(await machineRepository.list({ includeHidden: true })).toHaveLength(2);
    expect((await machineRepository.get('old')).retired).toBe(true);
  });

  it('returns a placeholder for unknown IDs', async () => {
    expect(await machineRepository.get('gone')).toMatchObject({
      id: 'gone',
      name: 'Unknown machine',
      unknown: true,
    });
  });

  it('sets and clears photos for catalog and custom machines', async () => {
    const custom = await machineRepository.addCustom({ name: 'X', muscleGroup: 'arms', weightStepKg: 1, aliases: [] });
    await machineRepository.setPhoto(custom, 'p1');
    await machineRepository.setPhoto('b-l-row', 'p2');
    expect((await machineRepository.get(custom)).photoId).toBe('p1');
    expect((await machineRepository.get('b-l-row')).photoId).toBe('p2');
    await machineRepository.setPhoto(custom, null);
    await machineRepository.setPhoto('b-l-row', null);
    expect((await machineRepository.get(custom)).photoId).toBeUndefined();
    expect((await machineRepository.get('b-l-row')).photoId).toBeUndefined();
  });
});

describe('loadCatalog', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setCatalog(null);
  });

  it('fetches once and caches; a failed fetch is retried', async () => {
    setCatalog(null);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(catalog) });
    vi.stubGlobal('fetch', fetchMock);
    await expect(loadCatalog()).rejects.toThrow('500');
    expect(await loadCatalog()).toBe(catalog);
    expect(await loadCatalog()).toBe(catalog);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith('/catalog/catalog.json');
  });
});

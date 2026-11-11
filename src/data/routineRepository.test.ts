import { beforeEach, describe, expect, it } from 'vitest';
import { freshDb } from '../test/db';
import * as routineRepository from './routineRepository';

const item = (machineId: string) => ({ machineId, targetSets: 3, targetReps: 10 });
const ids = async () => (await routineRepository.get()).items.map((i) => i.machineId);

beforeEach(async () => {
  await freshDb();
});

describe('routineRepository', () => {
  it('creates the empty main routine on first use', async () => {
    const r = await routineRepository.get();
    expect(r).toMatchObject({ id: 'main', items: [], deletedAt: null });
    expect(await routineRepository.get()).toEqual(r);
  });

  it('adds (replacing duplicates), removes and moves items', async () => {
    for (const id of ['a', 'b', 'c']) await routineRepository.addItem(item(id));
    await routineRepository.addItem({ ...item('a'), targetReps: 8 });
    expect(await ids()).toEqual(['b', 'c', 'a']);

    await routineRepository.moveItem('a', 'up');
    expect(await ids()).toEqual(['b', 'a', 'c']);
    await routineRepository.moveItem('b', 'down');
    expect(await ids()).toEqual(['a', 'b', 'c']);
    await routineRepository.moveItem('a', 'up');
    await routineRepository.moveItem('c', 'down');
    await routineRepository.moveItem('zzz', 'up');
    expect(await ids()).toEqual(['a', 'b', 'c']);

    await routineRepository.removeItem('b');
    expect(await ids()).toEqual(['a', 'c']);
  });

  it('replaces the routine name and items', async () => {
    await routineRepository.addItem(item('old'));
    await routineRepository.replace('Push · Pull · Legs: Push', [item('a'), item('b')]);
    const r = await routineRepository.get();
    expect(r.name).toBe('Push · Pull · Legs: Push');
    expect(r.items.map((i) => i.machineId)).toEqual(['a', 'b']);
  });
});

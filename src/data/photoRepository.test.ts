import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { T0 } from '../test/factories';
import { freshDb } from '../test/db';
import * as photoRepository from './photoRepository';

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(T0));
  await freshDb();
});
afterEach(() => vi.useRealTimers());

describe('photoRepository', () => {
  it('puts, gets and soft-deletes photos', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' });
    const id = await photoRepository.put(blob, 'image/webp');
    expect((await photoRepository.get(id))?.mime).toBe('image/webp');
    await photoRepository.delete(id);
    expect(await photoRepository.get(id)).toBeUndefined();
    expect((await photoRepository.get(id, { includeDeleted: true }))?.deletedAt).toBe(T0);
    expect(await photoRepository.get('nope')).toBeUndefined();
  });
});

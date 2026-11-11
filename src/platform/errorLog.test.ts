import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkoutDb } from '../db/schema';
import { T0 } from '../test/factories';
import { freshDb } from '../test/db';
import { MAX_ERRORS, clearMemoryErrors, installHandlers, logError, memoryErrors } from './errorLog';

let db: WorkoutDb;

beforeEach(async () => {
  db = await freshDb();
  clearMemoryErrors();
});

afterEach(() => {
  vi.restoreAllMocks();
  db.close();
});

describe('logError', () => {
  it('keeps at most 500 rows, deleting the oldest', async () => {
    await db.errors.bulkAdd(
      Array.from({ length: MAX_ERRORS }, (_, i) => ({ at: T0, kind: 'old', message: `old ${i}` })),
    );

    await logError('test', new Error('newest'));
    await logError('test', 'plain text');

    expect(await db.errors.count()).toBe(MAX_ERRORS);
    const rows = await db.errors.orderBy('seq').toArray();
    expect(rows[0]?.message).toBe('old 2');
    expect(rows.at(-2)).toMatchObject({ kind: 'test', message: 'Error: newest' });
    expect(rows.at(-1)?.message).toBe('plain text');
  });

  it('falls back to memory when the database is unavailable', async () => {
    vi.spyOn(db.errors, 'add').mockRejectedValue(new Error('db gone'));

    await expect(logError('test', { code: 7 })).resolves.toBeUndefined();

    expect(memoryErrors()).toEqual([expect.objectContaining({ kind: 'test', message: '{"code":7}' })]);
    expect(await db.errors.count()).toBe(0);
  });
});

describe('installHandlers', () => {
  it('logs window errors and unhandled rejections', async () => {
    const remove = installHandlers();
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('uncaught') }));
    const rejection = new Event('unhandledrejection') as PromiseRejectionEvent;
    Object.defineProperty(rejection, 'reason', { value: new Error('rejected') });
    window.dispatchEvent(rejection);
    remove();

    await vi.waitFor(async () => expect(await db.errors.count()).toBe(2));
    const kinds = (await db.errors.toArray()).map((e) => e.kind).sort();
    expect(kinds).toEqual(['error', 'unhandledrejection']);
  });
});

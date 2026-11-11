import { describe, expect, it } from 'vitest';
import type { Session, SessionState } from '../db/types';
import { at, makeSession, T0 } from '../test/factories';
import { isOpen, isStale, next, STALE_AFTER_MS, type SessionEvent } from './sessionMachine';

const resting = (): Session =>
  makeSession({ state: 'resting', startedAt: T0, restStartedAt: T0, restEndsAt: at(90) });

describe('next', () => {
  it('start: notStarted -> active with startedAt', () => {
    const s = next(makeSession(), { type: 'start' }, at(5));
    expect(s).toMatchObject({ state: 'active', startedAt: at(5), updatedAt: at(5) });
  });

  it('discard: soft-deletes a notStarted session', () => {
    const s = next(makeSession(), { type: 'discard' }, at(5));
    expect(s.deletedAt).toBe(at(5));
    expect(isOpen(s)).toBe(false);
  });

  it('setSaved from active and resting starts a new rest', () => {
    for (const state of ['active', 'resting'] as const) {
      const s = next(makeSession({ state }), { type: 'setSaved', restSec: 60 }, at(10));
      expect(s).toMatchObject({ state: 'resting', restStartedAt: at(10), restEndsAt: at(70) });
    }
  });

  it.each(['restEnded', 'restSkipped', 'lastSetUndone'] as const)(
    '%s: resting -> active and clears rest fields',
    (type) => {
      const s = next(resting(), { type }, at(30));
      expect(s.state).toBe('active');
      expect(s.restStartedAt).toBeUndefined();
      expect(s.restEndsAt).toBeUndefined();
    },
  );

  it('restAdjusted moves the end, never before now', () => {
    expect(next(resting(), { type: 'restAdjusted', deltaSec: 15 }, at(10)).restEndsAt).toBe(at(105));
    expect(next(resting(), { type: 'restAdjusted', deltaSec: -15 }, at(10)).restEndsAt).toBe(at(75));
    expect(next(resting(), { type: 'restAdjusted', deltaSec: -15 }, at(85)).restEndsAt).toBe(at(85));
  });

  it('finish from active and resting', () => {
    for (const s of [makeSession({ state: 'active' }), resting()]) {
      const done = next(s, { type: 'finish' }, at(100));
      expect(done).toMatchObject({ state: 'finished', finishedAt: at(100) });
      expect(done.restEndsAt).toBeUndefined();
    }
  });

  const invalid: [SessionState, SessionEvent][] = [
    ['active', { type: 'start' }],
    ['resting', { type: 'start' }],
    ['finished', { type: 'start' }],
    ['active', { type: 'discard' }],
    ['finished', { type: 'discard' }],
    ['notStarted', { type: 'setSaved', restSec: 60 }],
    ['finished', { type: 'setSaved', restSec: 60 }],
    ['active', { type: 'restEnded' }],
    ['notStarted', { type: 'restSkipped' }],
    ['active', { type: 'lastSetUndone' }],
    ['active', { type: 'restAdjusted', deltaSec: 15 }],
    ['notStarted', { type: 'finish' }],
    ['finished', { type: 'finish' }],
  ];
  it.each(invalid)('in %s ignores %o', (state, event) => {
    const s = makeSession({ state });
    expect(next(s, event, at(1))).toBe(s);
  });

  it('restAdjusted without restEndsAt is ignored', () => {
    const s = makeSession({ state: 'resting' });
    expect(next(s, { type: 'restAdjusted', deltaSec: 15 }, at(1))).toBe(s);
  });
});

describe('isStale', () => {
  const after = (ms: number) => new Date(Date.parse(T0) + ms).toISOString();

  it('counts from startedAt for started sessions', () => {
    const s = makeSession({ state: 'active', createdAt: at(-99999), startedAt: T0 });
    expect(isStale(s, after(STALE_AFTER_MS))).toBe(false);
    expect(isStale(s, after(STALE_AFTER_MS + 1))).toBe(true);
  });

  it('counts from createdAt for notStarted sessions', () => {
    const s = makeSession();
    expect(isStale(s, after(STALE_AFTER_MS + 1))).toBe(true);
  });

  it('is false for finished sessions or missing startedAt', () => {
    expect(isStale(makeSession({ state: 'finished', startedAt: T0 }), after(STALE_AFTER_MS * 2))).toBe(false);
    expect(isStale(makeSession({ state: 'active' }), after(STALE_AFTER_MS * 2))).toBe(false);
  });
});

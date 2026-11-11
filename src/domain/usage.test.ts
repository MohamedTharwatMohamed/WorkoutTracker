import { describe, expect, it } from 'vitest';
import { makeSession, makeSet } from '../test/factories';
import { usageSummary } from './usage';

const NOW = '2025-03-01T12:00:00.000Z';
const daysAgo = (d: number) => new Date(Date.parse(NOW) - d * 86_400_000).toISOString();

describe('usageSummary', () => {
  it('counts the 28 days before now, excluding deleted and notStarted', () => {
    const sessions = [
      makeSession({ id: 'a', state: 'finished', startedAt: daysAgo(1) }),
      makeSession({ id: 'b', state: 'finished', startedAt: daysAgo(1) }),
      makeSession({ id: 'c', state: 'active', startedAt: daysAgo(27.9) }),
      makeSession({ id: 'edge', state: 'finished', startedAt: daysAgo(28) }),
      makeSession({ id: 'old', state: 'finished', startedAt: daysAgo(40) }),
      makeSession({ id: 'del', state: 'finished', startedAt: daysAgo(2), deletedAt: daysAgo(2) }),
      makeSession({ id: 'ns', state: 'notStarted' }),
    ];
    const sets = [
      makeSet({ id: '1', loggedAt: daysAgo(1) }),
      makeSet({ id: '2', loggedAt: daysAgo(1) }),
      makeSet({ id: '3', loggedAt: daysAgo(27.9) }),
      makeSet({ id: '4', loggedAt: daysAgo(28) }),
      makeSet({ id: '5', loggedAt: daysAgo(1), deletedAt: daysAgo(1) }),
    ];
    expect(usageSummary(sessions, sets, NOW)).toEqual({
      activeDays: 2,
      sessions: 3,
      sets: 3,
      setsPerSession: 1,
    });
  });

  it('returns zeros with no sessions', () => {
    expect(usageSummary([], [], NOW)).toEqual({ activeDays: 0, sessions: 0, sets: 0, setsPerSession: 0 });
  });
});

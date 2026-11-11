import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SCHEMA_VERSION } from '../buildInfo';
import type { WorkoutDb } from '../db/schema';
import { T0, at, journalEntry, makeMeasurement, makeProfile, makeSession, makeSet } from '../test/factories';
import { freshDb } from '../test/db';
import { buildDiagnostics } from './diagnostics';

let db: WorkoutDb;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(T0);
  db = await freshDb();
});

afterEach(() => {
  vi.useRealTimers();
  db.close();
});

describe('buildDiagnostics', () => {
  it('holds no set, measurement or profile values, and includes usageSummary', async () => {
    const started = at(-3600);
    await db.profile.add(makeProfile({ heightCm: 187.3 }));
    await db.sessions.add(makeSession({ state: 'finished', startedAt: started }));
    await db.sets.bulkAdd([
      makeSet({ id: 'a', weightKg: 123.75, reps: 47, loggedAt: at(-3000) }),
      makeSet({ id: 'b', setNumber: 2, weightKg: 98.25, reps: 39, loggedAt: at(-2900) }),
    ]);
    await db.journal.bulkAdd([journalEntry(1, 'set.created', 'a'), journalEntry(2, 'set.created', 'b')]);
    await db.measurements.add(makeMeasurement({ site: 'waist', value: 91.65 }));

    const diagnostics = await buildDiagnostics();
    const text = JSON.stringify(diagnostics);

    for (const value of ['187.3', '123.75', '98.25', '47', '39', '91.65']) {
      expect(text).not.toContain(value);
    }
    for (const key of ['weightKg', 'reps', 'heightCm', 'value', 'site']) {
      expect(text).not.toContain(`"${key}"`);
    }
    expect(diagnostics.usageSummary).toEqual({ activeDays: 1, sessions: 1, sets: 2, setsPerSession: 2 });
    expect(diagnostics.counts).toMatchObject({ sets: 2, sessions: 1, measurements: 1, profile: 1 });
    expect(diagnostics.consistency.clean).toBe(true);
    expect(diagnostics.catalogVersion).toBe(1);
    expect(diagnostics.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('reports a consistency problem and the error log', async () => {
    await db.journal.add(journalEntry(1, 'set.created', 'lost'));
    await db.errors.add({ at: T0, kind: 'test', message: 'boom' });

    const diagnostics = await buildDiagnostics();

    expect(diagnostics.consistency).toMatchObject({ clean: false, missing: ['lost'] });
    expect(diagnostics.errors.map((e) => e.message)).toEqual(['boom']);
  });
});

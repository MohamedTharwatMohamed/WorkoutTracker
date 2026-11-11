import type {
  JournalEntry,
  Measurement,
  Profile,
  Session,
  SetRecord,
} from '../db/types';
import type { Catalog, CatalogMachine } from '../data/catalog';

export const T0 = '2025-01-10T10:00:00.000Z';

export function at(offsetSec: number, from = T0): string {
  return new Date(Date.parse(from) + offsetSec * 1000).toISOString();
}

const base = (id: string, now = T0) => ({
  id,
  createdAt: now,
  updatedAt: now,
  deletedAt: null as string | null,
  deviceId: 'dev-test',
});

export function makeSession(over: Partial<Session> = {}): Session {
  return { ...base('s1'), state: 'notStarted', machineOrder: [], ...over };
}

export function makeSet(over: Partial<SetRecord> = {}): SetRecord {
  return {
    ...base('set1'),
    sessionId: 's1',
    machineId: 'm1',
    setNumber: 1,
    reps: 10,
    weightKg: 40,
    loggedAt: T0,
    ...over,
  };
}

export function makeMeasurement(over: Partial<Measurement> = {}): Measurement {
  return { ...base('meas1'), site: 'weight', value: 80, takenAt: T0, ...over };
}

export function makeProfile(over: Partial<Profile> = {}): Profile {
  return {
    ...base('me'),
    id: 'me',
    heightCm: 180,
    weightUnit: 'kg',
    lengthUnit: 'cm',
    defaultRestSec: 90,
    ...over,
  };
}

export function journalEntry(seq: number, type: JournalEntry['type'], entityId: string): JournalEntry {
  return { seq, at: T0, type, entityId, sessionId: 's1' };
}

export function catalogMachine(over: Partial<CatalogMachine> = {}): CatalogMachine {
  return {
    id: 'brand-line-chest-press',
    brand: 'Brand',
    line: 'Line',
    model: 'Chest Press',
    muscleGroup: 'chest',
    secondaryMuscles: ['triceps'],
    note: 'note',
    weightStepKg: 5,
    defaultRestSec: null,
    image: null,
    imageSourceUrl: null,
    aliases: ['bench machine'],
    retired: false,
    ...over,
  };
}

export function makeCatalog(machines: CatalogMachine[] = [catalogMachine()]): Catalog {
  return {
    catalogVersion: 1,
    muscleGroups: ['chest', 'back', 'shoulders', 'arms', 'legs', 'core'],
    machines,
  };
}

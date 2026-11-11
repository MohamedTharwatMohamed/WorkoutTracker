import Dexie, { type EntityTable, type Table } from 'dexie';
import type {
  CustomMachine,
  ErrorEntry,
  JournalEntry,
  MachineSettings,
  Measurement,
  MetaEntry,
  Photo,
  Profile,
  Routine,
  Session,
  SetRecord,
} from './types';

export const DB_NAME = 'workout-tracker';

/*
 * Upgrade rules:
 * - Version numbers only increase.
 * - An upgrade may only add tables, indexes or fields with defaults.
 * - Never delete or rename tables, fields or data.
 * - Each new version adds a fixture and an upgrade test (src/db/open.test.ts).
 */
export class WorkoutDb extends Dexie {
  profile!: EntityTable<Profile, 'id'>;
  machines!: EntityTable<CustomMachine, 'id'>;
  machineSettings!: EntityTable<MachineSettings, 'machineId'>;
  photos!: EntityTable<Photo, 'id'>;
  routines!: EntityTable<Routine, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  sets!: EntityTable<SetRecord, 'id'>;
  measurements!: EntityTable<Measurement, 'id'>;
  journal!: Table<JournalEntry, number>;
  errors!: Table<ErrorEntry, number>;
  meta!: EntityTable<MetaEntry, 'key'>;

  constructor(name: string = DB_NAME) {
    super(name);
    this.version(1).stores({
      profile: 'id',
      machines: 'id, updatedAt',
      machineSettings: 'machineId, updatedAt',
      photos: 'id, updatedAt',
      routines: 'id, updatedAt',
      sessions: 'id, state, startedAt, updatedAt',
      sets: 'id, sessionId, [machineId+loggedAt], loggedAt, updatedAt',
      measurements: 'id, [site+takenAt], updatedAt',
      journal: '++seq, entityId',
      errors: '++seq',
      meta: 'key',
    });
  }
}

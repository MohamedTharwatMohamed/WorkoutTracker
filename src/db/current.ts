import { WorkoutDb } from './schema';

let current: WorkoutDb | null = null;

/** The database instance used by the repositories. */
export function getDb(): WorkoutDb {
  if (!current) current = new WorkoutDb();
  return current;
}

export function setDb(db: WorkoutDb | null): void {
  if (current && current !== db) current.close();
  current = db;
}

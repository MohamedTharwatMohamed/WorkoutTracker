import { setDb } from '../db/current';
import { WorkoutDb } from '../db/schema';
import { setCatalog } from '../data/catalog';
import { makeCatalog } from './factories';

/** Opens a fresh database (setup.ts gives each test a new IndexedDB) and a test catalog. */
export async function freshDb(catalog = makeCatalog()): Promise<WorkoutDb> {
  const db = new WorkoutDb();
  await db.open();
  setDb(db);
  setCatalog(catalog);
  return db;
}

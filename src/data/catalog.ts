import type { MuscleGroup } from '../db/types';

export interface CatalogMachine {
  id: string;
  brand: string;
  line: string;
  model: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles: string[];
  note: string;
  weightStepKg: number;
  defaultRestSec: number | null;
  image: string | null;
  imageSourceUrl: string | null;
  aliases: string[];
  retired: boolean;
}

export interface Catalog {
  catalogVersion: number;
  muscleGroups: MuscleGroup[];
  machines: CatalogMachine[];
}

let cached: Promise<Catalog> | null = null;

/** Fetches /catalog/catalog.json once (answered from the precache) and keeps it in memory. */
export function loadCatalog(): Promise<Catalog> {
  if (!cached) {
    cached = fetch('/catalog/catalog.json')
      .then((response) => {
        if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
        return response.json() as Promise<Catalog>;
      })
      .catch((error: unknown) => {
        cached = null;
        throw error;
      });
  }
  return cached;
}

/** Replaces the in-memory catalog (tests, or after a fetch in another context). */
export function setCatalog(catalog: Catalog | null): void {
  cached = catalog ? Promise.resolve(catalog) : null;
}

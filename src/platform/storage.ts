export const MARKER_KEY = 'workout-tracker-marker';

export interface MarkerCounts {
  sets: number;
  sessions: number;
  measurements: number;
}

export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  return navigator.storage.persist();
}

export async function status(): Promise<{ persisted: boolean; usage?: number; quota?: number }> {
  const persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : false;
  const estimate = navigator.storage?.estimate ? await navigator.storage.estimate() : {};
  return { persisted, usage: estimate.usage, quota: estimate.quota };
}

/** Counts include soft-deleted rows, so deleting records never lowers them. */
export function writeMarker(counts: MarkerCounts): void {
  try {
    localStorage.setItem(MARKER_KEY, JSON.stringify(counts));
  } catch {
    // localStorage can be unavailable (private mode, quota); detection is best effort.
  }
}

export function readMarker(): MarkerCounts | null {
  try {
    const raw = localStorage.getItem(MARKER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MarkerCounts>;
    if (
      typeof parsed.sets !== 'number' ||
      typeof parsed.sessions !== 'number' ||
      typeof parsed.measurements !== 'number'
    ) {
      return null;
    }
    return { sets: parsed.sets, sessions: parsed.sessions, measurements: parsed.measurements };
  } catch {
    return null;
  }
}

export function clearMarker(): void {
  try {
    localStorage.removeItem(MARKER_KEY);
  } catch {
    // ignore
  }
}

import type { Routine, RoutineItem } from '../db/types';
import { db, deviceId, nowIso } from './internal';

export const MAIN_ROUTINE_ID = 'main';

/** Returns the main routine, creating it empty on first use. */
export async function get(): Promise<Routine> {
  const device = await deviceId();
  return db().transaction('rw', db().routines, async () => {
    const existing = await db().routines.get(MAIN_ROUTINE_ID);
    if (existing) return existing;
    const now = nowIso();
    const routine: Routine = {
      id: MAIN_ROUTINE_ID,
      name: 'My routine',
      items: [],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deviceId: device,
    };
    await db().routines.add(routine);
    return routine;
  });
}

/** Read-only lookup for live queries (which cannot write); undefined before first use. */
export function peek(): Promise<Routine | undefined> {
  return db().routines.get(MAIN_ROUTINE_ID);
}

export async function save(routine: Routine): Promise<void> {
  await db().routines.put({ ...routine, updatedAt: nowIso(), deviceId: await deviceId() });
}

async function change(fn: (items: RoutineItem[]) => RoutineItem[]): Promise<Routine> {
  const routine = await get();
  const updated = { ...routine, items: fn(routine.items) };
  await save(updated);
  return updated;
}

/** Replaces the whole routine, for example with a day from a ready-made plan. */
export async function replace(name: string, items: RoutineItem[]): Promise<Routine> {
  const updated = { ...(await get()), name, items: items.map((i) => ({ ...i })) };
  await save(updated);
  return updated;
}

export function addItem(item: RoutineItem): Promise<Routine> {
  return change((items) => [...items.filter((i) => i.machineId !== item.machineId), item]);
}

export function removeItem(machineId: string): Promise<Routine> {
  return change((items) => items.filter((i) => i.machineId !== machineId));
}

export function moveItem(machineId: string, direction: 'up' | 'down'): Promise<Routine> {
  return change((items) => {
    const index = items.findIndex((i) => i.machineId === machineId);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= items.length) return items;
    const copy = [...items];
    [copy[index], copy[target]] = [copy[target] as RoutineItem, copy[index] as RoutineItem];
    return copy;
  });
}

import type { BaseRecord, CustomMachine, MachineSettings, MuscleGroup } from '../db/types';
import { customMachineId } from '../domain/ids';
import { loadCatalog, type CatalogMachine } from './catalog';
import { db, deviceId, nowIso } from './internal';

export const UNKNOWN_MACHINE_NAME = 'Unknown machine';

export interface MachineView {
  id: string;
  name: string;
  brand?: string;
  line?: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles: string[];
  note?: string;
  weightStepKg: number;
  settingsRestSec?: number;
  customRestSec?: number;
  defaultRestSec: number | null;
  /** Step set by the user or by a custom machine (used for lb stepping). */
  ownStepKg?: number;
  image: string | null;
  photoId?: string;
  hidden: boolean;
  retired: boolean;
  custom: boolean;
  unknown: boolean;
  aliases: string[];
}

function fromCatalog(m: CatalogMachine, s?: MachineSettings): MachineView {
  return {
    id: m.id,
    name: m.model,
    brand: m.brand,
    line: m.line,
    muscleGroup: m.muscleGroup,
    secondaryMuscles: m.secondaryMuscles,
    note: m.note,
    weightStepKg: s?.weightStepKg ?? m.weightStepKg,
    settingsRestSec: s?.restSec,
    defaultRestSec: m.defaultRestSec,
    ownStepKg: s?.weightStepKg,
    image: m.image,
    photoId: s?.photoId,
    hidden: s?.hidden ?? false,
    retired: m.retired,
    custom: false,
    unknown: false,
    aliases: m.aliases,
  };
}

function fromCustom(m: CustomMachine, s?: MachineSettings): MachineView {
  return {
    id: m.id,
    name: m.name,
    muscleGroup: m.muscleGroup,
    secondaryMuscles: [],
    weightStepKg: s?.weightStepKg ?? m.weightStepKg,
    settingsRestSec: s?.restSec,
    customRestSec: m.restSec,
    defaultRestSec: null,
    ownStepKg: s?.weightStepKg ?? m.weightStepKg,
    image: null,
    photoId: m.photoId,
    hidden: s?.hidden ?? false,
    retired: false,
    custom: true,
    unknown: false,
    aliases: m.aliases,
  };
}

function unknownMachine(id: string): MachineView {
  return {
    id,
    name: UNKNOWN_MACHINE_NAME,
    muscleGroup: 'core',
    secondaryMuscles: [],
    weightStepKg: 5,
    defaultRestSec: null,
    image: null,
    hidden: false,
    retired: false,
    custom: false,
    unknown: true,
    aliases: [],
  };
}

async function allViews(): Promise<MachineView[]> {
  const [catalog, settings, customs] = await Promise.all([
    loadCatalog(),
    db().machineSettings.toArray(),
    db().machines.toArray(),
  ]);
  const byId = new Map(settings.map((s) => [s.machineId, s]));
  return [
    ...catalog.machines.map((m) => fromCatalog(m, byId.get(m.id))),
    ...customs.filter((m) => m.deletedAt === null).map((m) => fromCustom(m, byId.get(m.id))),
  ];
}

export async function list(
  filter: { query?: string; muscleGroup?: MuscleGroup; includeHidden?: boolean } = {},
): Promise<MachineView[]> {
  const query = filter.query?.trim().toLowerCase();
  return (await allViews()).filter((m) => {
    if (m.retired) return false;
    if (m.hidden && !filter.includeHidden) return false;
    if (filter.muscleGroup && m.muscleGroup !== filter.muscleGroup) return false;
    if (query) {
      const haystack = [m.name, m.brand ?? '', m.line ?? '', ...m.aliases].join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

/** Returns any machine by ID, including retired ones, or an "Unknown machine" placeholder. */
export async function get(id: string): Promise<MachineView> {
  return (await allViews()).find((m) => m.id === id) ?? unknownMachine(id);
}

/** Like `get` for several IDs, in the same order, reading storage once. */
export async function getMany(ids: string[]): Promise<MachineView[]> {
  const byId = new Map((await allViews()).map((m) => [m.id, m]));
  return ids.map((id) => byId.get(id) ?? unknownMachine(id));
}

export async function updateCustom(
  id: string,
  patch: Partial<Pick<CustomMachine, 'name' | 'muscleGroup' | 'weightStepKg' | 'restSec'>>,
): Promise<void> {
  const device = await deviceId();
  await db().transaction('rw', db().machines, async () => {
    const existing = await db().machines.get(id);
    if (!existing) throw new Error('Custom machine not found');
    const updated: CustomMachine = { ...existing, ...patch, updatedAt: nowIso(), deviceId: device };
    if ('restSec' in patch && patch.restSec === undefined) delete updated.restSec;
    await db().machines.put(updated);
  });
}

export async function addCustom(input: Omit<CustomMachine, keyof BaseRecord>): Promise<string> {
  const now = nowIso();
  const id = customMachineId();
  await db().machines.add({
    ...input,
    id,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deviceId: await deviceId(),
  });
  return id;
}

export async function updateSettings(
  machineId: string,
  patch: Partial<Omit<MachineSettings, 'machineId' | 'updatedAt' | 'deviceId'>>,
): Promise<void> {
  const device = await deviceId();
  const table = db().machineSettings;
  await db().transaction('rw', table, async () => {
    const existing = await table.get(machineId);
    await table.put({
      hidden: false,
      ...existing,
      ...patch,
      machineId,
      updatedAt: nowIso(),
      deviceId: device,
    });
  });
}

export async function setPhoto(machineId: string, photoId: string | null): Promise<void> {
  const custom = await db().machines.get(machineId);
  if (custom) {
    const updated: CustomMachine = { ...custom, updatedAt: nowIso(), deviceId: await deviceId() };
    if (photoId) updated.photoId = photoId;
    else delete updated.photoId;
    await db().machines.put(updated);
    return;
  }
  const device = await deviceId();
  await db().transaction('rw', db().machineSettings, async () => {
    const existing = await db().machineSettings.get(machineId);
    const updated: MachineSettings = {
      hidden: false,
      ...existing,
      machineId,
      updatedAt: nowIso(),
      deviceId: device,
    };
    if (photoId) updated.photoId = photoId;
    else delete updated.photoId;
    await db().machineSettings.put(updated);
  });
}

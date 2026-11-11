import type { BaseRecord, CustomPlan } from '../db/types';
import { MUSCLE_GROUPS } from '../db/types';
import { newId } from '../domain/ids';
import { db, deviceId, nowIso } from './internal';
import * as machineRepository from './machineRepository';
import type { Plan } from './plans';

export type PlanInput = Omit<CustomPlan, keyof BaseRecord>;

export const CUSTOM_PLAN_PREFIX = 'my-';

/** Custom plans that are not deleted, newest first. */
export async function list(): Promise<CustomPlan[]> {
  const rows = await db().plans.toArray();
  return rows.filter((p) => p.deletedAt === null).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function get(id: string): Promise<CustomPlan | undefined> {
  const plan = await db().plans.get(id);
  return plan && plan.deletedAt === null ? plan : undefined;
}

function copy(input: PlanInput): PlanInput {
  return {
    ...input,
    days: input.days.map((d) => ({ name: d.name, items: d.items.map((i) => ({ ...i })) })),
  };
}

/** Adds a plan, or updates it when `id` is given. Returns the plan's ID. */
export async function save(input: PlanInput, id?: string): Promise<string> {
  const now = nowIso();
  const device = await deviceId();
  return db().transaction('rw', db().plans, async () => {
    const existing = id ? await db().plans.get(id) : undefined;
    const plan: CustomPlan = {
      ...copy(input),
      id: existing?.id ?? `${CUSTOM_PLAN_PREFIX}${newId()}`,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
      deviceId: device,
    };
    await db().plans.put(plan);
    return plan.id;
  });
}

/**
 * Adds imported plans. A custom plan with the same name (ignoring case) is replaced
 * in place so importing the same file twice does not make copies.
 */
export async function importMany(inputs: PlanInput[]): Promise<{ added: number; replaced: number }> {
  const existing = await list();
  const byName = new Map(existing.map((p) => [p.name.trim().toLowerCase(), p.id]));
  let replaced = 0;
  for (const input of inputs) {
    const id = byName.get(input.name.trim().toLowerCase());
    if (id) replaced += 1;
    byName.set(input.name.trim().toLowerCase(), await save(input, id));
  }
  return { added: inputs.length - replaced, replaced };
}

/** Custom plans shaped like ready-made plans, with focus taken from their machines. */
export async function views(): Promise<Plan[]> {
  return toViews(await list());
}

export async function view(id: string): Promise<Plan | undefined> {
  const plan = await get(id);
  return plan ? (await toViews([plan]))[0] : undefined;
}

async function toViews(plans: CustomPlan[]): Promise<Plan[]> {
  const ids = [...new Set(plans.flatMap((p) => p.days.flatMap((d) => d.items.map((i) => i.machineId))))];
  const machines = await machineRepository.getMany(ids);
  const groups = new Map(ids.map((id, i) => [id, machines[i]!.muscleGroup]));
  return plans.map((p) => {
    const focus = new Set(p.days.flatMap((d) => d.items.map((i) => groups.get(i.machineId)!)));
    return {
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      goal: p.goal,
      level: p.level,
      focus: MUSCLE_GROUPS.filter((g) => focus.has(g)),
      daysPerWeek: p.daysPerWeek,
      minutes: p.minutes,
      days: p.days,
      custom: true,
    };
  });
}

/** Soft-deletes a plan so backups keep the record. */
export async function remove(id: string): Promise<void> {
  const device = await deviceId();
  await db().transaction('rw', db().plans, async () => {
    const existing = await db().plans.get(id);
    if (!existing) return;
    const now = nowIso();
    await db().plans.put({ ...existing, deletedAt: now, updatedAt: now, deviceId: device });
  });
}

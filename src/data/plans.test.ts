import { describe, expect, it } from 'vitest';
import catalogJson from '../../public/catalog/catalog.json';
import { PLANS } from './plans';

const catalog = catalogJson as { machines: { id: string; retired: boolean }[] };
const active = new Set(catalog.machines.filter((m) => !m.retired).map((m) => m.id));

describe('PLANS', () => {
  it('uses only active catalog machines, once per day, with unique plan IDs', () => {
    expect(new Set(PLANS.map((p) => p.id)).size).toBe(PLANS.length);
    for (const plan of PLANS) {
      for (const day of plan.days) {
        const ids = day.items.map((i) => i.machineId);
        expect(ids.filter((id) => !active.has(id)), `${plan.id} / ${day.name}`).toEqual([]);
        expect(new Set(ids).size, `${plan.id} / ${day.name} repeats a machine`).toBe(ids.length);
      }
    }
  });
});

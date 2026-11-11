import { beforeEach, describe, expect, it } from 'vitest';
import { checkPlanDraft } from '../domain/planDraft';
import type { PlanDraft } from '../domain/planTemplate';
import { freshDb } from '../test/db';
import { catalogMachine, makeCatalog } from '../test/factories';
import * as planRepository from './planRepository';

const chest = 'brand-line-chest-press';
const plan = (name: string, extra: Partial<PlanDraft> = {}): PlanDraft => ({
  name,
  tagline: '',
  description: '',
  goal: 'strength',
  level: 'beginner',
  daysPerWeek: 2,
  minutes: 45,
  days: [{ name: 'A', items: [{ machineId: chest, targetSets: 3, targetReps: 10 }] }],
  ...extra,
});

beforeEach(async () => {
  await freshDb(makeCatalog([catalogMachine()]));
});

describe('planRepository', () => {
  it('saves, updates and soft-deletes plans', async () => {
    const id = await planRepository.save(plan('Mine'));
    expect(id.startsWith(planRepository.CUSTOM_PLAN_PREFIX)).toBe(true);
    await planRepository.save(plan('Mine v2'), id);
    expect((await planRepository.list()).map((p) => p.name)).toEqual(['Mine v2']);

    const view = await planRepository.view(id);
    expect(view).toMatchObject({ id, custom: true, focus: ['chest'] });

    await planRepository.remove(id);
    expect(await planRepository.list()).toEqual([]);
    expect(await planRepository.view(id)).toBeUndefined();
  });

  it('replaces a same-name plan on import instead of copying it', async () => {
    const id = await planRepository.save(plan('Push'));
    expect(await planRepository.importMany([plan('push', { minutes: 60 }), plan('Pull')])).toEqual({ added: 1, replaced: 1 });
    const list = await planRepository.list();
    expect(list).toHaveLength(2);
    expect(list.find((p) => p.id === id)).toMatchObject({ name: 'push', minutes: 60 });
  });
});

describe('checkPlanDraft', () => {
  it('needs a unique name, sensible minutes and named, filled days', () => {
    expect(checkPlanDraft(plan('Mine'), ['Other'])).toEqual([]);
    expect(
      checkPlanDraft(
        plan(' mine ', {
          minutes: 2,
          days: [
            { name: 'A', items: [] },
            { name: 'a ', items: [{ machineId: chest, targetSets: 3, targetReps: 10 }] },
            { name: ' ', items: [{ machineId: chest, targetSets: 3, targetReps: 10 }] },
          ],
        }),
        ['MINE'],
      ),
    ).toEqual([
      'You already have a plan with this name.',
      'Minutes per workout must be a whole number from 5 to 240.',
      'Every day needs a name.',
      'Each day needs a different name.',
      'Add at least one machine to A.',
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import catalog from '../../public/catalog/catalog.json';
import type { MuscleGroup } from '../db/types';
import { machineMuscles, regionLevels } from './muscles';

const machines = catalog.machines as { id: string; model: string; muscleGroup: MuscleGroup; secondaryMuscles: string[] }[];
const byId = (id: string) => machineMuscles(machines.find((m) => m.id === id)!);

describe('machineMuscles', () => {
  it('maps specific machines to the right primary regions', () => {
    expect(byId('life-fitness-insignia-seated-leg-curl').primary).toEqual(['hamstring']);
    expect(byId('technogym-selection-900-arm-curl').primary).toEqual(['biceps']);
    expect(byId('life-fitness-insignia-back-extension').primary).toEqual(['lower-back']);
    expect(byId('hammer-strength-plate-loaded-iso-lateral-incline-press').primary).toEqual(['chest']);
    expect(byId('technogym-selection-900-adductor').primary).toEqual(['adductors']);
  });

  it('turns secondary muscle names into regions, without repeating primaries', () => {
    const legPress = byId('technogym-selection-900-leg-press');
    expect(legPress.primary).toEqual(['quadriceps', 'gluteal']);
    expect(legPress.secondary).toEqual(['hamstring', 'calves']);
  });

  it('gives every catalog machine at least one primary region', () => {
    for (const m of machines) expect(machineMuscles(m).primary.length, m.id).toBeGreaterThan(0);
  });

  it('falls back to the muscle group for custom machines', () => {
    expect(machineMuscles({ id: 'custom-1', name: 'My press', muscleGroup: 'shoulders' }).primary).toEqual(['deltoids']);
  });
});

describe('regionLevels', () => {
  it('spreads a group level over its regions and clamps it', () => {
    const levels = regionLevels({ arms: 2, chest: 0.5 });
    expect(levels.get('biceps')).toBe(1);
    expect(levels.get('forearm')).toBe(1);
    expect(levels.get('chest')).toBe(0.5);
    expect(levels.has('quadriceps')).toBe(false);
  });
});

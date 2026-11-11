import type { MuscleGroup } from '../db/types';

/** Muscle regions drawn on the anatomical body map. */
export type MuscleRegion =
  | 'chest'
  | 'deltoids'
  | 'biceps'
  | 'triceps'
  | 'forearm'
  | 'abs'
  | 'obliques'
  | 'trapezius'
  | 'upper-back'
  | 'lower-back'
  | 'gluteal'
  | 'quadriceps'
  | 'hamstring'
  | 'adductors'
  | 'calves'
  | 'tibialis';

export const REGIONS_BY_GROUP: Record<MuscleGroup, readonly MuscleRegion[]> = {
  chest: ['chest'],
  back: ['upper-back', 'trapezius'],
  shoulders: ['deltoids'],
  arms: ['biceps', 'triceps', 'forearm'],
  legs: ['quadriceps', 'hamstring', 'gluteal', 'adductors', 'calves', 'tibialis'],
  core: ['abs', 'obliques', 'lower-back'],
};

const SECONDARY: Record<string, MuscleRegion[]> = {
  'front delts': ['deltoids'],
  'rear delts': ['deltoids'],
  shoulders: ['deltoids'],
  triceps: ['triceps'],
  biceps: ['biceps'],
  forearms: ['forearm'],
  'upper back': ['upper-back', 'trapezius'],
  chest: ['chest'],
  glutes: ['gluteal'],
  hamstrings: ['hamstring'],
  quads: ['quadriceps'],
  calves: ['calves'],
  'lower back': ['lower-back'],
  core: ['abs'],
};

// First match wins; checked against the machine id and name.
const PRIMARY_RULES: [RegExp, MuscleRegion[]][] = [
  [/back-extension|back extension/, ['lower-back']],
  [/abdominal|crunch/, ['abs', 'obliques']],
  [/triceps/, ['triceps']],
  [/biceps|arm-curl|arm curl/, ['biceps']],
  [/leg-curl|leg curl/, ['hamstring']],
  [/leg-extension|leg extension/, ['quadriceps']],
  [/leg-press|leg press|hack-squat|hack squat/, ['quadriceps', 'gluteal']],
  [/adductor/, ['adductors']],
  [/abductor|glute/, ['gluteal']],
  [/calf/, ['calves']],
  [/reverse-fly|reverse fly/, ['deltoids', 'trapezius']],
  [/row/, ['upper-back', 'trapezius']],
  [/lat-|pulldown|lat machine/, ['upper-back']],
];

export interface MachineMuscles {
  primary: MuscleRegion[];
  secondary: MuscleRegion[];
}

/** Regions a machine trains, from its name, muscle group and listed secondary muscles. */
export function machineMuscles(machine: {
  id: string;
  name?: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles?: readonly string[];
}): MachineMuscles {
  const text = `${machine.id} ${machine.name ?? ''}`.toLowerCase();
  const rule = PRIMARY_RULES.find(([pattern]) => pattern.test(text));
  const primary = rule ? rule[1] : [...REGIONS_BY_GROUP[machine.muscleGroup].slice(0, 2)];
  const secondary = [
    ...new Set((machine.secondaryMuscles ?? []).flatMap((m) => SECONDARY[m.toLowerCase()] ?? [])),
  ].filter((r) => !primary.includes(r));
  return { primary: [...primary], secondary };
}

/** Spreads per-group levels (0–1) onto the regions of each group. */
export function regionLevels(levels: Partial<Record<MuscleGroup, number>>): Map<MuscleRegion, number> {
  const out = new Map<MuscleRegion, number>();
  for (const [group, level] of Object.entries(levels) as [MuscleGroup, number][]) {
    for (const region of REGIONS_BY_GROUP[group]) out.set(region, Math.max(0, Math.min(1, level)));
  }
  return out;
}

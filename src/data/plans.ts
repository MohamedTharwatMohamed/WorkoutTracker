import type { MuscleGroup, PlanDay, PlanGoal, PlanLevel, RoutineItem, SetScheme } from '../db/types';

export { PLAN_GOALS, PLAN_LEVELS } from '../db/types';
export type { PlanDay, PlanGoal, PlanLevel } from '../db/types';

export interface Plan {
  id: string;
  name: string;
  tagline: string;
  description: string;
  goal: PlanGoal;
  level: PlanLevel;
  focus: MuscleGroup[];
  daysPerWeek: number;
  minutes: number;
  days: PlanDay[];
  /** True for plans the user made or imported. */
  custom?: boolean;
}

const M = {
  chestPress: 'technogym-selection-900-chest-press',
  pecFly: 'life-fitness-insignia-pectoral-fly-rear-deltoid',
  inclinePress: 'hammer-strength-plate-loaded-iso-lateral-incline-press',
  convergingPress: 'matrix-versa-converging-chest-press',
  latMachine: 'technogym-selection-900-lat-machine',
  lowRow: 'technogym-selection-900-low-row',
  frontPulldown: 'hammer-strength-plate-loaded-iso-lateral-front-lat-pulldown',
  isoRow: 'hammer-strength-plate-loaded-iso-lateral-row',
  divergingRow: 'matrix-versa-diverging-seated-row',
  shoulderPress: 'technogym-selection-900-shoulder-press',
  isoShoulderPress: 'hammer-strength-plate-loaded-iso-lateral-shoulder-press',
  reverseFly: 'technogym-selection-900-reverse-fly',
  bicepsCurl: 'life-fitness-insignia-biceps-curl',
  armCurl: 'technogym-selection-900-arm-curl',
  tricepsExt: 'life-fitness-insignia-triceps-extension',
  tricepsPress: 'matrix-versa-triceps-press',
  legPress: 'technogym-selection-900-leg-press',
  linearLegPress: 'hammer-strength-plate-loaded-linear-leg-press',
  legExt: 'life-fitness-insignia-leg-extension',
  legExtMatrix: 'matrix-versa-leg-extension',
  seatedCurl: 'life-fitness-insignia-seated-leg-curl',
  proneCurl: 'technogym-selection-900-prone-leg-curl',
  abductor: 'technogym-selection-900-abductor',
  adductor: 'technogym-selection-900-adductor',
  glute: 'matrix-versa-glute',
  calf: 'life-fitness-insignia-calf-extension',
  crunch: 'technogym-selection-900-abdominal-crunch',
  abdominal: 'matrix-versa-abdominal',
  backExt: 'life-fitness-insignia-back-extension',
} as const;

const x = (machineId: string, targetSets: number, targetReps: number, scheme?: SetScheme): RoutineItem => ({
  machineId,
  targetSets,
  targetReps,
  ...(scheme && { scheme }),
});

/** Ready-made machine-only plans. Applying a day copies it into "My routine". */
export const PLANS: readonly Plan[] = [
  {
    id: 'full-body-starter',
    name: 'Full Body Starter',
    tagline: 'Your first 8 weeks on the machines',
    description:
      'Two alternating full-body days, three times a week. Every major muscle, moderate reps and plenty of rest to learn each machine.',
    goal: 'health',
    level: 'beginner',
    focus: ['chest', 'back', 'legs', 'core'],
    daysPerWeek: 3,
    minutes: 45,
    days: [
      {
        name: 'Day A',
        items: [x(M.legPress, 3, 12), x(M.chestPress, 3, 12), x(M.latMachine, 3, 12), x(M.shoulderPress, 2, 12), x(M.seatedCurl, 2, 12), x(M.crunch, 2, 15)],
      },
      {
        name: 'Day B',
        items: [x(M.legExt, 3, 12), x(M.lowRow, 3, 12), x(M.pecFly, 3, 12), x(M.proneCurl, 2, 12), x(M.armCurl, 2, 12), x(M.backExt, 2, 15)],
      },
    ],
  },
  {
    id: 'push-pull-legs',
    name: 'Push · Pull · Legs',
    tagline: 'The classic split for building muscle',
    description:
      'Pressing muscles, pulling muscles and legs on separate days. Run it once (3 days) or twice (6 days) a week.',
    goal: 'muscle',
    level: 'intermediate',
    focus: ['chest', 'back', 'shoulders', 'arms', 'legs'],
    daysPerWeek: 3,
    minutes: 60,
    days: [
      {
        name: 'Push',
        items: [x(M.inclinePress, 4, 8, 'pyramid'), x(M.chestPress, 3, 10), x(M.isoShoulderPress, 3, 10), x(M.pecFly, 3, 12), x(M.tricepsPress, 3, 12, 'dropSet')],
      },
      {
        name: 'Pull',
        items: [x(M.frontPulldown, 4, 8, 'pyramid'), x(M.isoRow, 3, 10), x(M.latMachine, 3, 12), x(M.reverseFly, 3, 15), x(M.bicepsCurl, 3, 12, 'dropSet')],
      },
      {
        name: 'Legs',
        items: [x(M.linearLegPress, 4, 10, 'pyramid'), x(M.legExt, 3, 12), x(M.seatedCurl, 3, 12), x(M.calf, 4, 15, 'lastMax'), x(M.abdominal, 3, 15)],
      },
    ],
  },
  {
    id: 'upper-lower-strength',
    name: 'Upper / Lower Strength',
    tagline: 'Heavier sets, fewer reps, more strength',
    description:
      'Four days a week alternating upper and lower body. Low reps on the big machines, then lighter accessory work.',
    goal: 'strength',
    level: 'intermediate',
    focus: ['chest', 'back', 'legs'],
    daysPerWeek: 4,
    minutes: 60,
    days: [
      {
        name: 'Upper',
        items: [x(M.convergingPress, 4, 5, 'reversePyramid'), x(M.isoRow, 5, 5), x(M.isoShoulderPress, 3, 6, 'topSets'), x(M.frontPulldown, 4, 6), x(M.tricepsExt, 3, 8)],
      },
      {
        name: 'Lower',
        items: [x(M.linearLegPress, 4, 5, 'reversePyramid'), x(M.proneCurl, 4, 6), x(M.legExtMatrix, 3, 8), x(M.calf, 4, 10), x(M.backExt, 3, 10)],
      },
    ],
  },
  {
    id: 'legs-and-glutes',
    name: 'Legs & Glutes Focus',
    tagline: 'Strong legs, solid hips',
    description:
      'Two lower-body days that work quads, hamstrings, glutes and calves from every angle, plus core to finish.',
    goal: 'muscle',
    level: 'beginner',
    focus: ['legs', 'core'],
    daysPerWeek: 2,
    minutes: 50,
    days: [
      {
        name: 'Quads & Glutes',
        items: [x(M.legPress, 4, 10, 'pyramid'), x(M.legExt, 3, 12), x(M.glute, 3, 12), x(M.abductor, 3, 15, 'dropSet'), x(M.calf, 3, 15)],
      },
      {
        name: 'Hamstrings & Hips',
        items: [x(M.linearLegPress, 3, 12), x(M.seatedCurl, 4, 10), x(M.proneCurl, 3, 12), x(M.adductor, 3, 15), x(M.crunch, 3, 15)],
      },
    ],
  },
  {
    id: 'chest-and-arms',
    name: 'Chest & Arms Focus',
    tagline: 'Upper-body shape and size',
    description:
      'A press-and-curl day and a fly-and-extension day. Pair it with a legs day from another plan for balance.',
    goal: 'muscle',
    level: 'beginner',
    focus: ['chest', 'arms'],
    daysPerWeek: 2,
    minutes: 45,
    days: [
      {
        name: 'Chest & Biceps',
        items: [x(M.chestPress, 3, 8, 'topSets'), x(M.inclinePress, 3, 10), x(M.bicepsCurl, 3, 12), x(M.armCurl, 3, 12)],
      },
      {
        name: 'Chest & Triceps',
        items: [x(M.convergingPress, 4, 10, 'reversePyramid'), x(M.pecFly, 3, 12), x(M.tricepsPress, 3, 12), x(M.tricepsExt, 3, 12)],
      },
    ],
  },
  {
    id: 'back-and-posture',
    name: 'Back & Posture',
    tagline: 'Undo the desk hunch',
    description:
      'Rows, pulldowns and rear-delt work to pull the shoulders back, with lower-back and core work for a strong trunk.',
    goal: 'health',
    level: 'beginner',
    focus: ['back', 'shoulders', 'core'],
    daysPerWeek: 2,
    minutes: 40,
    days: [
      {
        name: 'Posture',
        items: [x(M.lowRow, 3, 12), x(M.latMachine, 3, 12), x(M.reverseFly, 3, 15), x(M.backExt, 3, 12), x(M.abdominal, 3, 15, 'lastMax')],
      },
    ],
  },
  {
    id: 'lean-and-toned',
    name: 'Lean & Toned Circuit',
    tagline: 'High reps, short rests, full body',
    description:
      'One full-body circuit with lighter weights and 15 reps. Keep rests short to keep the heart rate up.',
    goal: 'toning',
    level: 'beginner',
    focus: ['legs', 'chest', 'back', 'core'],
    daysPerWeek: 3,
    minutes: 35,
    days: [
      {
        name: 'Circuit',
        items: [x(M.legPress, 3, 15), x(M.chestPress, 3, 15), x(M.lowRow, 3, 15), x(M.shoulderPress, 2, 15), x(M.seatedCurl, 2, 15), x(M.crunch, 3, 20, 'lastMax')],
      },
    ],
  },
  {
    id: 'core-and-lower-back',
    name: 'Core & Lower Back',
    tagline: 'A strong middle protects everything',
    description:
      'A short add-on session for abs, lower back and hips. Add it after any workout or on a light day.',
    goal: 'health',
    level: 'beginner',
    focus: ['core'],
    daysPerWeek: 2,
    minutes: 20,
    days: [
      {
        name: 'Core',
        items: [x(M.crunch, 3, 15), x(M.abdominal, 3, 15), x(M.backExt, 3, 12), x(M.abductor, 2, 15)],
      },
    ],
  },
];

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

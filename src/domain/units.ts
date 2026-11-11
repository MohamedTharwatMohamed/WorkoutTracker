export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;
export const LB_STEP = 2.5;

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export const kgToLb = (kg: number): number => kg / KG_PER_LB;
export const lbToKg = (lb: number): number => lb * KG_PER_LB;
export const cmToIn = (cm: number): number => cm / CM_PER_IN;
export const inToCm = (inches: number): number => inches * CM_PER_IN;

/** Moves to the next multiple of stepKg in the given direction, never below 0. */
export function stepWeight(weightKg: number, stepKg: number, direction: 1 | -1): number {
  const eps = 1e-9;
  const steps = weightKg / stepKg;
  const nextSteps =
    direction === 1 ? Math.floor(steps + eps) + 1 : Math.ceil(steps - eps) - 1;
  return Math.max(0, round6(nextSteps * stepKg));
}

/**
 * Step used by the weight stepper, in kg. A step the user or a custom machine
 * set wins; otherwise lb users get 2.5 lb and kg users get the catalog step.
 */
export function stepKgFor(
  machine: { ownStepKg?: number; catalogStepKg: number },
  weightUnit: 'kg' | 'lb',
): number {
  if (machine.ownStepKg !== undefined) return machine.ownStepKg;
  return weightUnit === 'lb' ? lbToKg(LB_STEP) : machine.catalogStepKg;
}

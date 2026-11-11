import { describe, expect, it } from 'vitest';
import { formatWeight } from '../format';
import { cmToIn, inToCm, kgToLb, lbToKg, stepKgFor, stepWeight } from './units';

describe('conversions', () => {
  it('round-trips kg/lb and cm/in', () => {
    expect(lbToKg(kgToLb(42.5))).toBeCloseTo(42.5, 10);
    expect(inToCm(cmToIn(91.4))).toBeCloseTo(91.4, 10);
    expect(lbToKg(1)).toBe(0.45359237);
    expect(inToCm(1)).toBe(2.54);
  });
});

describe('stepWeight', () => {
  it('moves to the next multiple of the step', () => {
    expect(stepWeight(40, 5, 1)).toBe(45);
    expect(stepWeight(40, 5, -1)).toBe(35);
    expect(stepWeight(42, 5, 1)).toBe(45);
    expect(stepWeight(42, 5, -1)).toBe(40);
  });

  it('never goes below 0', () => {
    expect(stepWeight(0, 5, -1)).toBe(0);
    expect(stepWeight(2, 5, -1)).toBe(0);
  });

  it('steps 2.5 lb cleanly for lb users', () => {
    const step = stepKgFor({ catalogStepKg: 5 }, 'lb');
    let kg = lbToKg(100);
    kg = stepWeight(kg, step, 1);
    expect(kgToLb(kg)).toBeCloseTo(102.5, 4);
    kg = stepWeight(kg, step, 1);
    expect(kgToLb(kg)).toBeCloseTo(105, 4);
  });
});

describe('stepKgFor', () => {
  it('prefers the machine own step, then the unit default', () => {
    expect(stepKgFor({ ownStepKg: 1, catalogStepKg: 5 }, 'lb')).toBe(1);
    expect(stepKgFor({ catalogStepKg: 5 }, 'kg')).toBe(5);
    expect(stepKgFor({ catalogStepKg: 5 }, 'lb')).toBeCloseTo(1.13398, 5);
  });
});

describe('lb display', () => {
  it('rounds to 0.5 lb', () => {
    expect(formatWeight(lbToKg(102.5), 'lb')).toContain('102.5');
    expect(formatWeight(lbToKg(102.6), 'lb')).toContain('102.5');
  });
});

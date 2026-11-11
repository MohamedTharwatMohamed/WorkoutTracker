import { describe, expect, it } from 'vitest';
import { at, T0 } from '../test/factories';
import { actualRestSec, remainingSec, restLengthFor } from './restTimer';

describe('remainingSec', () => {
  it('counts down from wall-clock time, so backgrounded time is included', () => {
    expect(remainingSec(at(90), T0)).toBe(90);
    expect(remainingSec(at(90), at(60.2))).toBe(30);
  });

  it('never goes below 0', () => {
    expect(remainingSec(at(90), at(500))).toBe(0);
  });
});

describe('actualRestSec', () => {
  it('returns whole seconds and clamps negatives', () => {
    expect(actualRestSec(T0, at(95.7))).toBe(95);
    expect(actualRestSec(at(10), T0)).toBe(0);
  });
});

describe('restLengthFor', () => {
  const profile = { defaultRestSec: 90 };
  it('uses user setting, then custom machine, then catalog, then profile', () => {
    expect(restLengthFor({ settingsRestSec: 30, customRestSec: 45, defaultRestSec: 60 }, profile)).toBe(30);
    expect(restLengthFor({ customRestSec: 45, defaultRestSec: 60 }, profile)).toBe(45);
    expect(restLengthFor({ defaultRestSec: 60 }, profile)).toBe(60);
    expect(restLengthFor({ defaultRestSec: null }, profile)).toBe(90);
  });
});

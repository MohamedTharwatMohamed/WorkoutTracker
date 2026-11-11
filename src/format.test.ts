import { describe, expect, it } from 'vitest';
import { cmToDisplay, kgToDisplay } from './format';

describe('format', () => {
  it('keeps kg and cm unchanged', () => {
    expect(kgToDisplay(62.5, 'kg')).toBe(62.5);
    expect(cmToDisplay(81.3, 'cm')).toBe(81.3);
  });

  it('rounds lb to 0.5 lb', () => {
    expect(kgToDisplay(20, 'lb')).toBe(44);
    expect(kgToDisplay(25, 'lb')).toBe(55);
    expect(kgToDisplay(61, 'lb')).toBe(134.5);
  });

  it('rounds inches to 0.1 in', () => {
    expect(cmToDisplay(81.3, 'in')).toBe(32);
    expect(cmToDisplay(100, 'in')).toBe(39.4);
  });
});

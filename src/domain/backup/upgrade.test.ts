import { afterEach, describe, expect, it } from 'vitest';
import { upgradeBackup, upgradeSteps } from './upgrade';

describe('upgradeBackup', () => {
  afterEach(() => {
    delete upgradeSteps[1];
  });

  it('returns a current-version file unchanged', () => {
    const file = { formatVersion: 1, data: {} };
    expect(upgradeBackup(file, 1)).toBe(file);
  });

  it('applies each step in order and bumps formatVersion', () => {
    upgradeSteps[1] = (f) => ({ ...f, added: true });
    expect(upgradeBackup({ formatVersion: 1 }, 2)).toEqual({ formatVersion: 2, added: true });
  });

  it('throws when a step is missing', () => {
    expect(() => upgradeBackup({ formatVersion: 1 }, 2)).toThrow(
      'No upgrade from backup format version 1',
    );
  });
});

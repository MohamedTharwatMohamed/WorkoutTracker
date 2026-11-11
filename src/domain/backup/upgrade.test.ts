import { afterEach, describe, expect, it } from 'vitest';
import { BACKUP_FORMAT_VERSION } from '../../buildInfo';
import { upgradeBackup, upgradeSteps } from './upgrade';

describe('upgradeBackup', () => {
  afterEach(() => {
    delete upgradeSteps[BACKUP_FORMAT_VERSION];
  });

  it('returns a current-version file unchanged', () => {
    const file = { formatVersion: BACKUP_FORMAT_VERSION, data: {} };
    expect(upgradeBackup(file, BACKUP_FORMAT_VERSION)).toBe(file);
  });

  it('applies each step in order and bumps formatVersion', () => {
    const next = BACKUP_FORMAT_VERSION + 1;
    upgradeSteps[BACKUP_FORMAT_VERSION] = (f) => ({ ...f, added: true });
    expect(upgradeBackup({ formatVersion: BACKUP_FORMAT_VERSION }, next)).toEqual({ formatVersion: next, added: true });
  });

  it('throws when a step is missing', () => {
    expect(() => upgradeBackup({ formatVersion: BACKUP_FORMAT_VERSION }, BACKUP_FORMAT_VERSION + 1)).toThrow(
      `No upgrade from backup format version ${BACKUP_FORMAT_VERSION}`,
    );
  });

  it('1 to 2 adds a zero plans count and leaves data alone', () => {
    const data = { sets: [] };
    const file = upgradeBackup({ formatVersion: 1, manifest: { counts: { sets: 0 }, sha256: 'x' }, data }, 2);
    expect(file).toEqual({ formatVersion: 2, manifest: { counts: { sets: 0, plans: 0 }, sha256: 'x' }, data });
    expect(file.data).toBe(data);
  });
});

import { describe, expect, it } from 'vitest';
import canonicalText from '../../test/fixtures/canonical.txt?raw';
import goldenHash from '../../test/fixtures/backup-golden.sha256?raw';
import golden from '../../test/fixtures/backup-golden.json';
import { backupFileName, buildBackup, canonicalJson, checksum, sha256Hex } from './build';
import type { BackupData, BackupPhoto } from './format';

const goldenData = golden.data as unknown as BackupData;
const goldenPhotos = golden.photos as BackupPhoto[];

describe('canonicalJson', () => {
  it('sorts keys at every level, keeps array order and drops undefined', () => {
    expect(canonicalJson({ b: 1, a: [{ d: 2, c: undefined }, 3], c: null })).toBe(
      '{"a":[{"d":2},3],"b":1,"c":null}',
    );
    expect(canonicalJson([undefined])).toBe('[null]');
    expect(canonicalJson(undefined)).toBe('null');
  });

  it('matches the golden canonical text', () => {
    expect(canonicalJson({ data: golden.data, photos: golden.photos })).toBe(canonicalText);
  });
});

describe('checksum', () => {
  it('matches the golden SHA-256 (made with Python hashlib)', async () => {
    expect(await checksum(goldenData, goldenPhotos)).toBe(goldenHash.trim());
  });

  it('is the hex SHA-256 of the UTF-8 text', async () => {
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('buildBackup', () => {
  it('fills header, counts and checksum', async () => {
    const file = await buildBackup(goldenData, goldenPhotos, {
      appBuild: 'test',
      deviceId: 'dev',
      exportedAt: '2025-01-05T00:00:00.000Z',
    });
    expect(file).toMatchObject({
      format: 'workout-tracker-backup',
      formatVersion: 1,
      appBuild: 'test',
      manifest: {
        sha256: goldenHash.trim(),
        counts: { profile: 1, machines: 1, machineSettings: 1, routines: 1, sessions: 1, sets: 2, measurements: 1, photos: 1 },
      },
    });
  });

  it('names files by local date and time', () => {
    expect(backupFileName(new Date(2025, 0, 5, 7, 3))).toBe('workout-backup-2025-01-05-0703.json');
  });
});

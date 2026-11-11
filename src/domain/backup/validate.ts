import { MUSCLE_GROUPS, SIDED_SITES, SITES } from '../../db/types';
import { checksum } from './build';
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  countsOf,
  type BackupCounts,
  type BackupData,
  type BackupFile,
} from './format';
import { upgradeBackup } from './upgrade';

export type ValidationResult = { ok: true; file: BackupFile } | { ok: false; errors: string[] };

type Obj = Record<string, unknown>;
type Check = (r: Obj) => string | null;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isIso = (v: unknown): boolean => isStr(v) && !Number.isNaN(Date.parse(v));
const optional = (v: unknown, test: (x: unknown) => boolean) => v === undefined || test(v);
const isNonNeg = (v: unknown) => isNum(v) && v >= 0;

function fields(spec: Record<string, (v: unknown) => boolean>): Check {
  return (r) => {
    for (const [key, test] of Object.entries(spec)) {
      if (!test(r[key])) return `field "${key}"`;
    }
    return null;
  };
}

const base = fields({
  id: isStr,
  createdAt: isIso,
  updatedAt: isIso,
  deletedAt: (v) => v === null || isIso(v),
  deviceId: isStr,
});

const checks: Record<keyof Omit<BackupData, 'profile'> | 'profile', Check[]> = {
  profile: [
    base,
    fields({
      id: (v) => v === 'me',
      heightCm: (v) => v === null || isNonNeg(v),
      weightUnit: (v) => v === 'kg' || v === 'lb',
      lengthUnit: (v) => v === 'cm' || v === 'in',
      defaultRestSec: isNonNeg,
    }),
  ],
  machines: [
    base,
    fields({
      name: isStr,
      muscleGroup: (v) => MUSCLE_GROUPS.includes(v as never),
      weightStepKg: (v) => isNum(v) && v > 0,
      restSec: (v) => optional(v, isNonNeg),
      photoId: (v) => optional(v, isStr),
      aliases: (v) => Array.isArray(v) && v.every(isStr),
    }),
  ],
  machineSettings: [
    fields({
      machineId: isStr,
      updatedAt: isIso,
      deviceId: isStr,
      photoId: (v) => optional(v, isStr),
      weightStepKg: (v) => optional(v, (x) => isNum(x) && x > 0),
      restSec: (v) => optional(v, isNonNeg),
      hidden: (v) => typeof v === 'boolean',
    }),
  ],
  routines: [
    base,
    fields({
      name: isStr,
      items: (v) =>
        Array.isArray(v) &&
        v.every(
          (i) =>
            isObj(i) &&
            isStr(i.machineId) &&
            isNonNeg(i.targetSets) &&
            isNonNeg(i.targetReps) &&
            optional(i.targetWeightKg, isNonNeg),
        ),
    }),
  ],
  sessions: [
    base,
    fields({
      routineId: (v) => optional(v, isStr),
      state: (v) => ['notStarted', 'active', 'resting', 'finished'].includes(v as string),
      machineOrder: (v) => Array.isArray(v) && v.every(isStr),
      startedAt: (v) => optional(v, isIso),
      finishedAt: (v) => optional(v, isIso),
      currentMachineId: (v) => optional(v, isStr),
      restStartedAt: (v) => optional(v, isIso),
      restEndsAt: (v) => optional(v, isIso),
    }),
  ],
  sets: [
    base,
    fields({
      sessionId: isStr,
      machineId: isStr,
      setNumber: (v) => isNum(v) && v >= 1,
      reps: isNonNeg,
      weightKg: isNonNeg,
      loggedAt: isIso,
      restBeforeSec: (v) => optional(v, isNonNeg),
    }),
  ],
  measurements: [
    base,
    fields({
      site: (v) => SITES.includes(v as never),
      side: (v) => optional(v, (x) => x === 'left' || x === 'right'),
      value: (v) => isNum(v) && v > 0,
      takenAt: isIso,
    }),
    (r) => {
      const sided = SIDED_SITES.includes(r.site as never);
      return sided === (r.side !== undefined) ? null : 'field "side"';
    },
  ],
};

function checkTable(name: string, rows: unknown, errors: string[], key = 'id'): void {
  if (!Array.isArray(rows)) {
    errors.push(`data.${name} is not a list`);
    return;
  }
  const seen = new Set<string>();
  rows.forEach((row, i) => {
    if (!isObj(row)) {
      errors.push(`data.${name}[${i}] is not an object`);
      return;
    }
    for (const check of checks[name as keyof typeof checks]) {
      const problem = check(row);
      if (problem) errors.push(`data.${name}[${i}]: bad ${problem}`);
    }
    const id = row[key];
    if (isStr(id)) {
      if (seen.has(id)) errors.push(`data.${name}: duplicate ID ${id}`);
      seen.add(id);
    }
  });
}

export async function validateBackup(json: unknown): Promise<ValidationResult> {
  if (!isObj(json) || json.format !== BACKUP_FORMAT) {
    return { ok: false, errors: ['Not a Workout Tracker backup file'] };
  }
  if (!isNum(json.formatVersion)) {
    return { ok: false, errors: ['Missing format version'] };
  }
  if (json.formatVersion > BACKUP_FORMAT_VERSION) {
    return { ok: false, errors: ['Made by a newer app version; update first'] };
  }

  let file: Obj;
  try {
    file = upgradeBackup(json, BACKUP_FORMAT_VERSION);
  } catch (error) {
    return { ok: false, errors: [String(error instanceof Error ? error.message : error)] };
  }

  const errors: string[] = [];
  for (const key of ['schemaVersion'] as const) {
    if (!isNum(file[key])) errors.push(`field "${key}"`);
  }
  for (const key of ['appBuild', 'deviceId'] as const) {
    if (!isStr(file[key])) errors.push(`field "${key}"`);
  }
  if (!isIso(file.exportedAt)) errors.push('field "exportedAt"');

  const manifest = file.manifest;
  if (!isObj(manifest) || !isObj(manifest.counts) || !isStr(manifest.sha256)) {
    errors.push('field "manifest"');
  }
  const data = file.data;
  if (!isObj(data)) {
    errors.push('field "data"');
    return { ok: false, errors };
  }

  if (data.profile !== null) {
    if (!isObj(data.profile)) errors.push('data.profile is not an object');
    else checkTable('profile', [data.profile], errors);
  }
  for (const name of [
    'machines',
    'routines',
    'sessions',
    'sets',
    'measurements',
  ] as const) {
    checkTable(name, data[name], errors);
  }
  checkTable('machineSettings', data.machineSettings, errors, 'machineId');

  const photos = file.photos;
  if (!Array.isArray(photos)) {
    errors.push('field "photos"');
  } else {
    const seen = new Set<string>();
    photos.forEach((p, i) => {
      if (
        !isObj(p) ||
        !isStr(p.id) ||
        (p.mime !== 'image/webp' && p.mime !== 'image/jpeg') ||
        !isStr(p.base64)
      ) {
        errors.push(`photos[${i}]: bad photo`);
        return;
      }
      if (seen.has(p.id)) errors.push(`photos: duplicate ID ${p.id}`);
      seen.add(p.id);
    });
  }

  if (errors.length > 0) return { ok: false, errors };

  const valid = file as unknown as BackupFile;
  const expected = countsOf(valid.data, valid.photos);
  const stated = valid.manifest.counts as Partial<BackupCounts>;
  for (const [key, count] of Object.entries(expected)) {
    if (stated[key as keyof BackupCounts] !== count) {
      errors.push(`Count mismatch for ${key}`);
    }
  }
  if ((await checksum(valid.data, valid.photos)) !== valid.manifest.sha256) {
    errors.push('Checksum mismatch: the file is damaged or was edited');
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, file: valid };
}

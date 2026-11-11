export type Iso = string;

export interface BaseRecord {
  id: string;
  createdAt: Iso;
  updatedAt: Iso;
  deletedAt: Iso | null;
  deviceId: string;
}

export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core';
export const MUSCLE_GROUPS: readonly MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'core',
];

export interface Profile extends BaseRecord {
  id: 'me';
  heightCm: number | null;
  weightUnit: 'kg' | 'lb';
  lengthUnit: 'cm' | 'in';
  defaultRestSec: number;
  /** Weekly measurement day, 0 = Sunday … 6 = Saturday. Absent means no schedule. */
  checkInDay?: number;
}

export interface CustomMachine extends BaseRecord {
  name: string;
  muscleGroup: MuscleGroup;
  weightStepKg: number;
  restSec?: number;
  photoId?: string;
  aliases: string[];
}

// Key: machineId
export interface MachineSettings {
  machineId: string;
  updatedAt: Iso;
  deviceId: string;
  photoId?: string;
  weightStepKg?: number;
  restSec?: number;
  hidden: boolean;
}

export type PhotoMime = 'image/webp' | 'image/jpeg';
export interface Photo extends BaseRecord {
  blob: Blob;
  mime: PhotoMime;
}

/** How the sets of one exercise relate to each other (see domain/setScheme). */
export type SetScheme = 'straight' | 'pyramid' | 'reversePyramid' | 'topSets' | 'dropSet' | 'lastMax';
export const SET_SCHEMES: readonly SetScheme[] = ['straight', 'pyramid', 'reversePyramid', 'topSets', 'dropSet', 'lastMax'];

export interface RoutineItem {
  machineId: string;
  targetSets: number;
  targetReps: number;
  targetWeightKg?: number;
  /** Absent means 'straight'. */
  scheme?: SetScheme;
}

export type PlanGoal = 'muscle' | 'strength' | 'toning' | 'health';
export const PLAN_GOALS: readonly PlanGoal[] = ['muscle', 'strength', 'toning', 'health'];
export type PlanLevel = 'beginner' | 'intermediate';
export const PLAN_LEVELS: readonly PlanLevel[] = ['beginner', 'intermediate'];

export interface PlanDay {
  name: string;
  items: RoutineItem[];
}

/** A plan the user made or imported. Focus is worked out from its machines. */
export interface CustomPlan extends BaseRecord {
  name: string;
  tagline: string;
  description: string;
  goal: PlanGoal;
  level: PlanLevel;
  daysPerWeek: number;
  minutes: number;
  days: PlanDay[];
}

export interface Routine extends BaseRecord {
  name: string;
  items: RoutineItem[];
}

export type SessionState = 'notStarted' | 'active' | 'resting' | 'finished';
export interface Session extends BaseRecord {
  routineId?: string;
  state: SessionState;
  machineOrder: string[];
  startedAt?: Iso;
  finishedAt?: Iso;
  currentMachineId?: string;
  restStartedAt?: Iso;
  restEndsAt?: Iso;
}

export interface SetRecord extends BaseRecord {
  sessionId: string;
  machineId: string;
  setNumber: number;
  reps: number;
  weightKg: number;
  loggedAt: Iso;
  restBeforeSec?: number;
}

export type Site = 'weight' | 'waist' | 'hips' | 'chest' | 'neck' | 'arm' | 'thigh' | 'calf';
export const SITES: readonly Site[] = [
  'weight',
  'waist',
  'hips',
  'chest',
  'neck',
  'arm',
  'thigh',
  'calf',
];
export const SIDED_SITES: readonly Site[] = ['arm', 'thigh', 'calf'];
export type Side = 'left' | 'right';

// `value` is kg for `weight` and cm for every other site.
export interface Measurement extends BaseRecord {
  site: Site;
  side?: Side;
  value: number;
  takenAt: Iso;
}

export type JournalType = 'set.created' | 'set.updated' | 'set.deleted' | 'set.restored';
// Key: ++seq
export interface JournalEntry {
  seq?: number;
  at: Iso;
  type: JournalType;
  entityId: string;
  sessionId: string;
}

// Key: ++seq
export interface ErrorEntry {
  seq?: number;
  at: Iso;
  kind: string;
  message: string;
  stack?: string;
}

export type MetaKey =
  | 'deviceId'
  | 'lastExportAt'
  | 'lastExportState'
  | 'schemaVersion'
  | 'installedAt';
// Key: key
export interface MetaEntry {
  key: MetaKey;
  value: string | number | null;
}

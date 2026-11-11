import type {
  CustomMachine,
  Iso,
  MachineSettings,
  Measurement,
  PhotoMime,
  Profile,
  Routine,
  Session,
  SetRecord,
} from '../../db/types';

export { BACKUP_FORMAT_VERSION } from '../../buildInfo';
export const BACKUP_FORMAT = 'workout-tracker-backup';

export interface BackupData {
  profile: Profile | null;
  machines: CustomMachine[];
  machineSettings: MachineSettings[];
  routines: Routine[];
  sessions: Session[];
  sets: SetRecord[];
  measurements: Measurement[];
}

export interface BackupPhoto {
  id: string;
  mime: PhotoMime;
  base64: string;
}

export type BackupCounts = Record<keyof BackupData | 'photos', number>;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  schemaVersion: number;
  appBuild: string;
  exportedAt: Iso;
  deviceId: string;
  manifest: { counts: BackupCounts; sha256: string };
  data: BackupData;
  photos: BackupPhoto[];
}

export function countsOf(data: BackupData, photos: BackupPhoto[]): BackupCounts {
  return {
    profile: data.profile ? 1 : 0,
    machines: data.machines.length,
    machineSettings: data.machineSettings.length,
    routines: data.routines.length,
    sessions: data.sessions.length,
    sets: data.sets.length,
    measurements: data.measurements.length,
    photos: photos.length,
  };
}

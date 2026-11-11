import { SCHEMA_VERSION } from '../../buildInfo';
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  countsOf,
  type BackupData,
  type BackupFile,
  type BackupPhoto,
} from './format';

/**
 * JSON.stringify with object keys sorted by code unit order at every level,
 * arrays kept in order, no whitespace and undefined properties omitted.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => (v === undefined ? 'null' : canonicalJson(v))).join(',')}]`;
  }
  const entries = Object.keys(value)
    .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`);
  return `{${entries.join(',')}}`;
}

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function checksum(data: BackupData, photos: BackupPhoto[]): Promise<string> {
  return sha256Hex(canonicalJson({ data, photos }));
}

export async function buildBackup(
  data: BackupData,
  photos: BackupPhoto[],
  meta: { appBuild: string; deviceId: string; exportedAt: string },
): Promise<BackupFile> {
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    appBuild: meta.appBuild,
    exportedAt: meta.exportedAt,
    deviceId: meta.deviceId,
    manifest: { counts: countsOf(data, photos), sha256: await checksum(data, photos) },
    data,
    photos,
  };
}

export function backupFileName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `workout-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}.json`
  );
}

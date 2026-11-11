import { APP_BUILD } from '../buildInfo';
import * as backupRepository from '../data/backupRepository';
import * as metaRepository from '../data/metaRepository';
import { getDb } from '../db/current';
import { countRows } from '../db/open';
import type { Photo } from '../db/types';
import { base64ToBytes, bytesToBase64 } from '../domain/backup/base64';
import { backupFileName, buildBackup } from '../domain/backup/build';
import { countsOf, type BackupCounts, type BackupFile, type BackupPhoto } from '../domain/backup/format';
import { validateBackup } from '../domain/backup/validate';
import { newRecord } from '../domain/ids';
import { strings } from '../strings';
import { shareOrDownload, type ShareResult } from './share';
import { writeMarker } from './storage';

export class ImportCancelledError extends Error {
  constructor() {
    super(strings.backup.importCancelled);
    this.name = 'ImportCancelledError';
  }
}

export interface ImportPreview {
  backup: BackupFile;
  counts: BackupCounts;
  exportedAt: string;
  appBuild: string;
}

export type ImportResult = { ok: true; preview: ImportPreview } | { ok: false; errors: string[] };

async function toBackupPhoto(photo: Photo): Promise<BackupPhoto> {
  const bytes = new Uint8Array(await photo.blob.arrayBuffer());
  return { id: photo.id, mime: photo.mime, base64: bytesToBase64(bytes) };
}

/** Builds a backup of everything and shares or downloads it, then records the result in meta. */
export async function exportBackup(): Promise<ShareResult> {
  const { data, photos } = await backupRepository.readAll();
  // The backup format has no deletedAt for photos, so removed photos are left out.
  const live = photos.filter((p) => p.deletedAt === null);
  const now = new Date();
  const backup = await buildBackup(data, await Promise.all(live.map(toBackupPhoto)), {
    appBuild: APP_BUILD,
    deviceId: await metaRepository.getDeviceId(),
    exportedAt: now.toISOString(),
  });
  const file = new File([JSON.stringify(backup)], backupFileName(now), { type: 'application/json' });

  const result = await shareOrDownload(file);
  if (result !== 'cancelled') {
    await metaRepository.set('lastExportAt', new Date().toISOString());
    await metaRepository.set('lastExportState', result === 'shared' ? 'completed' : 'started');
  }
  return result;
}

/** Reads, validates and upgrades a backup file. Nothing is written. */
export async function importBackup(file: File): Promise<ImportResult> {
  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    return { ok: false, errors: [strings.backup.notJson] };
  }
  const result = await validateBackup(json);
  if (!result.ok) return result;
  const backup = result.file;
  return {
    ok: true,
    preview: {
      backup,
      counts: countsOf(backup.data, backup.photos),
      exportedAt: backup.exportedAt,
      appBuild: backup.appBuild,
    },
  };
}

/**
 * Replaces all data with the preview. The current data is exported first unless the
 * database holds no sets, sessions or measurements; if that export does not happen,
 * throws ImportCancelledError and changes nothing.
 */
export async function confirmImport(preview: ImportPreview): Promise<void> {
  const before = await countRows(getDb());
  if (before.sets + before.sessions + before.measurements > 0) {
    let result: ShareResult;
    try {
      result = await exportBackup();
    } catch {
      throw new ImportCancelledError();
    }
    if (result === 'cancelled') throw new ImportCancelledError();
  }

  const deviceId = await metaRepository.getDeviceId();
  const now = new Date().toISOString();
  const photos: Photo[] = preview.backup.photos.map((p) => ({
    ...newRecord(deviceId, now),
    id: p.id,
    mime: p.mime,
    blob: new Blob([base64ToBytes(p.base64) as Uint8Array<ArrayBuffer>], { type: p.mime }),
  }));
  await backupRepository.replaceAll({ data: preview.backup.data, photos });
  writeMarker(await countRows(getDb()));
}

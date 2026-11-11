import type { Photo } from '../db/types';
import { newRecord } from '../domain/ids';
import { db, deviceId, nowIso, type ReadOptions } from './internal';

export async function put(blob: Blob, mime: Photo['mime']): Promise<string> {
  const photo: Photo = { ...newRecord(await deviceId(), nowIso()), blob, mime };
  await db().photos.add(photo);
  return photo.id;
}

export async function get(id: string, options: ReadOptions = {}): Promise<Photo | undefined> {
  const photo = await db().photos.get(id);
  if (!photo || (photo.deletedAt !== null && !options.includeDeleted)) return undefined;
  return photo;
}

/** Soft delete, so a backup still records the removal. */
export async function remove(id: string): Promise<void> {
  const now = nowIso();
  await db().photos.update(id, { deletedAt: now, updatedAt: now, deviceId: await deviceId() });
}

export { remove as delete };

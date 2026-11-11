import type { Profile } from '../db/types';
import { db, deviceId, nowIso } from './internal';

export const DEFAULT_REST_SEC = 90;

export function get(): Promise<Profile | undefined> {
  return db().profile.get('me');
}

export async function save(profile: Profile): Promise<void> {
  await db().profile.put({ ...profile, updatedAt: nowIso(), deviceId: await deviceId() });
}

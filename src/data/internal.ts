import { getDb } from '../db/current';
import { ensureDeviceId } from '../db/meta';
import type { BaseRecord, Iso } from '../db/types';

export const db = getDb;

export function nowIso(): Iso {
  return new Date().toISOString();
}

export function deviceId(): Promise<string> {
  return ensureDeviceId(getDb());
}

export interface ReadOptions {
  includeDeleted?: boolean;
}

export function visible<T extends Pick<BaseRecord, 'deletedAt'>>(
  rows: T[],
  options: ReadOptions = {},
): T[] {
  return options.includeDeleted ? rows : rows.filter((r) => r.deletedAt === null);
}

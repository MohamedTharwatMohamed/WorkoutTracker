import type { BaseRecord, Iso } from '../db/types';

export function newId(): string {
  return crypto.randomUUID();
}

export function newRecord(deviceId: string, now: Iso): BaseRecord {
  return { id: newId(), createdAt: now, updatedAt: now, deletedAt: null, deviceId };
}

export function customMachineId(): string {
  return `custom-${newId()}`;
}

/** Catalog slug rule (design item 16). scripts/check-catalog.mjs keeps a copy. */
export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function catalogId(brand: string, line: string, machine: string): string {
  return [slug(brand), slug(line), slug(machine)].filter(Boolean).join('-');
}

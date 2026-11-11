import { SIDED_SITES, type BaseRecord, type Measurement, type Side, type Site } from '../db/types';
import { newRecord } from '../domain/ids';
import { db, deviceId, nowIso, visible, type ReadOptions } from './internal';

export class MeasurementError extends Error {}

type Input = Omit<Measurement, keyof BaseRecord>;

function checkSide(m: Pick<Measurement, 'site' | 'side'>): void {
  const sided = SIDED_SITES.includes(m.site);
  if (sided && !m.side) throw new MeasurementError(`${m.site} needs a side`);
  if (!sided && m.side) throw new MeasurementError(`${m.site} has no side`);
}

export async function add(input: Input): Promise<string> {
  checkSide(input);
  const record: Measurement = { ...newRecord(await deviceId(), nowIso()), ...input };
  await db().measurements.add(record);
  return record.id;
}

export async function update(id: string, patch: Partial<Input>): Promise<void> {
  const device = await deviceId();
  await db().transaction('rw', db().measurements, async () => {
    const existing = await db().measurements.get(id);
    if (!existing) throw new MeasurementError('Measurement not found');
    const merged: Measurement = { ...existing, ...patch, updatedAt: nowIso(), deviceId: device };
    if (patch.side === undefined && 'side' in patch) delete merged.side;
    checkSide(merged);
    await db().measurements.put(merged);
  });
}

export async function softDelete(id: string): Promise<void> {
  const now = nowIso();
  await db().measurements.update(id, { deletedAt: now, updatedAt: now, deviceId: await deviceId() });
}

/** Rows for one site (and side), oldest first. */
export async function series(site: Site, side?: Side, options: ReadOptions = {}): Promise<Measurement[]> {
  const rows = await db()
    .measurements.where('[site+takenAt]')
    .between([site, ''], [site, '\uffff'])
    .toArray();
  return visible(rows, options).filter((m) => m.side === side);
}

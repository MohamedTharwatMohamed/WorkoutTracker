import { cmToIn, kgToLb } from './domain/units';

export type WeightUnit = 'kg' | 'lb';
export type LengthUnit = 'cm' | 'in';

const nf = (maxFractionDigits: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: maxFractionDigits });

export function kgToDisplay(kg: number, unit: WeightUnit): number {
  if (unit === 'kg') return kg;
  return Math.round(kgToLb(kg) * 2) / 2;
}

export function cmToDisplay(cm: number, unit: LengthUnit): number {
  if (unit === 'cm') return cm;
  return Math.round(cmToIn(cm) * 10) / 10;
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${nf(2).format(kgToDisplay(kg, unit))} ${unit}`;
}

export function formatLength(cm: number, unit: LengthUnit): string {
  return `${nf(1).format(cmToDisplay(cm, unit))} ${unit}`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

/** m:ss, or h:mm:ss from one hour. */
export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export function formatNumber(value: number, maxFractionDigits = 1): string {
  return nf(maxFractionDigits).format(value);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${nf(0).format(bytes / 1024)} KB`;
  return `${nf(1).format(bytes / (1024 * 1024))} MB`;
}

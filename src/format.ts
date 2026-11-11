export type WeightUnit = 'kg' | 'lb';
export type LengthUnit = 'cm' | 'in';

export const LB_PER_KG = 2.2046226218;
export const CM_PER_IN = 2.54;

const nf = (maxFractionDigits: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: maxFractionDigits });

export function kgToDisplay(kg: number, unit: WeightUnit): number {
  if (unit === 'kg') return kg;
  return Math.round(kg * LB_PER_KG * 2) / 2;
}

export function cmToDisplay(cm: number, unit: LengthUnit): number {
  if (unit === 'cm') return cm;
  return Math.round((cm / CM_PER_IN) * 10) / 10;
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

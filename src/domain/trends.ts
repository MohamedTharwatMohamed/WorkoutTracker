import type { Iso, Measurement } from '../db/types';

export interface Point {
  date: Iso;
  value: number;
}

export function series(rows: Measurement[]): Point[] {
  return rows
    .filter((r) => r.deletedAt === null)
    .sort((a, b) => a.takenAt.localeCompare(b.takenAt))
    .map((r) => ({ date: r.takenAt, value: r.value }));
}

export function change(points: Point[]): number | null {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last || points.length < 2) return null;
  return Math.round((last.value - first.value) * 1000) / 1000;
}

export function hasTrend(points: Point[]): boolean {
  return points.length >= 2;
}

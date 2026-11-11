import { describe, expect, it } from 'vitest';
import { makeMeasurement, T0, at } from '../test/factories';
import { change, hasTrend, series } from './trends';

describe('trends', () => {
  const rows = [
    makeMeasurement({ id: 'b', takenAt: at(200), value: 79 }),
    makeMeasurement({ id: 'a', takenAt: T0, value: 81 }),
    makeMeasurement({ id: 'x', takenAt: at(100), value: 1, deletedAt: at(150) }),
    makeMeasurement({ id: 'c', takenAt: at(300), value: 78.4 }),
  ];

  it('sorts by takenAt and drops deleted rows', () => {
    expect(series(rows).map((p) => p.value)).toEqual([81, 79, 78.4]);
  });

  it('computes first-to-last change', () => {
    expect(change(series(rows))).toBe(-2.6);
    expect(change(series(rows.slice(0, 1)))).toBeNull();
    expect(change([])).toBeNull();
  });

  it('needs 2 or more points for a trend', () => {
    expect(hasTrend(series(rows))).toBe(true);
    expect(hasTrend(series(rows.slice(0, 1)))).toBe(false);
  });
});

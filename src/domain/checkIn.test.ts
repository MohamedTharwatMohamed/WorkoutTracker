import { describe, expect, it } from 'vitest';
import { checkInStatus } from './checkIn';

// 2025-03-07 is a Friday (day 5).
const friday = new Date(2025, 2, 7, 9);
const at = (day: number, hour = 8) => new Date(2025, 2, day, hour).toISOString();

describe('checkInStatus', () => {
  it('is due on the check-in day when nothing was measured', () => {
    expect(checkInStatus(5, undefined, friday)).toEqual({ state: 'due', overdueDays: 0 });
  });

  it('counts how many days a missed check-in is overdue', () => {
    expect(checkInStatus(3, at(1), friday)).toEqual({ state: 'due', overdueDays: 2 });
  });

  it('is done once measured on or shortly before the check-in day', () => {
    expect(checkInStatus(5, at(7), friday)).toEqual({ state: 'done', nextInDays: 7 });
    expect(checkInStatus(3, at(4), friday)).toEqual({ state: 'done', nextInDays: 5 });
    expect(checkInStatus(3, at(3), friday)).toEqual({ state: 'done', nextInDays: 5 });
    expect(checkInStatus(3, at(2), friday)).toEqual({ state: 'due', overdueDays: 2 });
  });
});

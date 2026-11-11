/** Weekly measurement check-in: is it due, or when is the next one? Days are 0 = Sunday … 6 = Saturday. */
export type CheckIn = { state: 'due'; overdueDays: number } | { state: 'done'; nextInDays: number };

/** Measuring up to this many days before the check-in day still counts for it. */
export const EARLY_DAYS = 2;

const DAY_MS = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysBetween = (from: Date, to: Date) => Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);

export function checkInStatus(checkInDay: number, lastMeasuredAt: string | undefined, now = new Date()): CheckIn {
  const today = startOfDay(now);
  const sinceDue = (today.getDay() - checkInDay + 7) % 7;
  const lastDue = new Date(today.getFullYear(), today.getMonth(), today.getDate() - sinceDue);
  if (lastMeasuredAt && daysBetween(new Date(lastMeasuredAt), lastDue) <= EARLY_DAYS) {
    return { state: 'done', nextInDays: 7 - sinceDue };
  }
  return { state: 'due', overdueDays: sinceDue };
}

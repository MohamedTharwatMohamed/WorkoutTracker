import { strings } from './strings';

/** The same motivation line all day, a new one each day. */
export function motivationOfDay(date = new Date()): string {
  const day = Math.floor(date.getTime() / 86_400_000);
  return strings.motivation[day % strings.motivation.length]!;
}

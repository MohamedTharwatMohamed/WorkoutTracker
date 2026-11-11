import { strings } from '../strings';
import { LIMITS, type PlanDraft } from './planTemplate';

const key = (s: string) => s.trim().toLowerCase();

/** Problems that stop a plan from being saved, in the order they appear on screen. */
export function checkPlanDraft(draft: PlanDraft, takenNames: readonly string[]): string[] {
  const t = strings.planEditor;
  const errors: string[] = [];
  if (!draft.name.trim()) errors.push(t.nameRequired);
  else if (takenNames.some((n) => key(n) === key(draft.name))) errors.push(t.nameTaken);
  const { min, max } = LIMITS.minutes;
  if (!Number.isInteger(draft.minutes) || draft.minutes < min || draft.minutes > max) {
    errors.push(t.numbers(t.minutes, min, max));
  }
  if (draft.days.some((d) => !d.name.trim())) errors.push(t.dayNameRequired);
  const names = draft.days.map((d) => key(d.name)).filter(Boolean);
  if (new Set(names).size !== names.length) errors.push(t.dayNameRepeated);
  for (const day of draft.days) if (day.items.length === 0) errors.push(t.dayEmpty(day.name.trim() || t.dayName));
  return errors;
}

/** A trimmed copy ready to store. */
export function cleanPlanDraft(draft: PlanDraft): PlanDraft {
  return {
    ...draft,
    name: draft.name.trim(),
    tagline: draft.tagline.trim(),
    description: draft.description.trim(),
    days: draft.days.map((d) => ({ name: d.name.trim(), items: d.items })),
  };
}

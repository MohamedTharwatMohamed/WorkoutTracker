import type { RoutineItem } from '../data/types';
import { setTargets, type SetTarget } from '../domain/setScheme';
import { formatWeight } from '../format';
import { strings } from '../strings';

/** Short text for one set's target, e.g. "10 reps · heavier ~90% (36 kg)". */
export function setHint(target: SetTarget, item: Pick<RoutineItem, 'targetWeightKg' | 'scheme'>, unit: 'kg' | 'lb'): string {
  const parts = [strings.setTarget.reps(target.reps, target.toFailure)];
  if (item.scheme && item.scheme !== 'straight') {
    let load = strings.setTarget.load[target.load];
    if (target.weightPct !== 100) load += ` ${strings.setTarget.pct(target.weightPct)}`;
    parts.push(load);
  }
  if (item.targetWeightKg !== undefined) {
    parts.push(formatWeight((item.targetWeightKg * target.weightPct) / 100, unit));
  }
  if (target.dropAfter) parts.push(strings.setTarget.dropAfter);
  return parts.join(' · ');
}

export function SchemeBadge({ item }: { item: Pick<RoutineItem, 'scheme'> }) {
  if (!item.scheme || item.scheme === 'straight') return null;
  const s = strings.schemes[item.scheme];
  return (
    <span title={s.how} className="inline-block rounded-full bg-accent/15 px-2 py-0.5 text-[0.7rem] font-semibold tracking-wide text-accent uppercase">
      {s.short}
    </span>
  );
}

/** Bar height for a weight percentage: 60% → 6px, 100% → 30px. */
const barPx = (pct: number) => `${Math.max(4, Math.round(6 + (pct - 60) * 0.6))}px`;

/** One small bar per set: height follows the suggested weight, label shows the reps. */
export function SetTargetsStrip({ item, className = '' }: { item: Pick<RoutineItem, 'targetSets' | 'targetReps' | 'scheme'>; className?: string }) {
  const targets = setTargets(item);
  return (
    <ol className={`flex items-end gap-1 ${className}`} aria-label={strings.schemes[item.scheme ?? 'straight'].how}>
      {targets.map((t) => (
        <li key={t.setNumber} className="flex items-end gap-1">
          <span className="flex flex-col items-center gap-0.5">
            <span aria-hidden className={`w-5 rounded-sm ${t.toFailure ? 'bg-accent' : 'bg-accent/50'}`} style={{ height: barPx(t.weightPct) }} />
            <span className="font-display text-xs leading-none tabular-nums">
              {t.reps}
              {t.toFailure ? '+' : ''}
            </span>
          </span>
          {t.dropAfter && (
            <span className="flex flex-col items-center gap-0.5">
              <span aria-hidden className="w-3 rounded-sm bg-danger/70" style={{ height: barPx(t.weightPct - 20) }} />
              <span className="font-display text-xs leading-none text-danger">↓</span>
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

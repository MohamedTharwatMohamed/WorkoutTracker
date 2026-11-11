import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { MachineImage } from '../components/MachineImage';
import { PageHeader } from '../components/PageHeader';
import * as machineRepository from '../data/machineRepository';
import { PLAN_GOALS, PLANS, type Plan, type PlanGoal } from '../data/plans';
import * as routineRepository from '../data/routineRepository';
import { MUSCLE_GROUPS, type MuscleGroup } from '../data/types';
import { strings } from '../strings';

const chip = (active: boolean) => `chip shrink-0 justify-center ${active ? 'bg-accent text-ink ring-accent' : ''}`;

/** A labelled, horizontally scrolling row of filter chips with an "All" option. */
function FilterRow<T extends string>({
  label,
  value,
  onChange,
  options,
  name,
}: {
  label: string;
  value: T | null;
  onChange: (v: T | null) => void;
  options: readonly T[];
  name: (v: T) => string;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-16 shrink-0 text-xs font-semibold uppercase tracking-[0.2em] text-muted">{label}</span>
      <div className="no-scrollbar -m-1 flex min-w-0 gap-2 overflow-x-auto p-1" role="group" aria-label={label}>
        <button type="button" className={`${chip(value === null)} min-w-16`} aria-pressed={value === null} onClick={() => onChange(null)}>
          {strings.plans.all}
        </button>
        {options.map((o) => (
          <button key={o} type="button" className={chip(value === o)} aria-pressed={value === o} onClick={() => onChange(o)}>
            {name(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

const allPlanMachineIds = [...new Set(PLANS.flatMap((p) => p.days.flatMap((d) => d.items.map((i) => i.machineId))))];

export function PlanMeta({ plan }: { plan: Plan }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-wide text-muted">
      <span>{strings.plans.perWeek(plan.daysPerWeek)}</span>
      <span>{strings.plans.minutes(plan.minutes)}</span>
      <span>{strings.plans.levels[plan.level]}</span>
    </div>
  );
}

export function PlansScreen() {
  const [goal, setGoal] = useState<PlanGoal | null>(null);
  const [focus, setFocus] = useState<MuscleGroup | null>(null);
  const data = useLiveQuery(async () => {
    const [routine, machines] = await Promise.all([routineRepository.peek(), machineRepository.getMany(allPlanMachineIds)]);
    return { routine: routine ?? null, machines: new Map(machines.map((m) => [m.id, m])) };
  }, []);

  const shown = PLANS.filter((p) => (!goal || p.goal === goal) && (!focus || p.focus.includes(focus)));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={strings.plans.title} tagline={strings.plans.tagline} word="Train" />

      <Link
        to="/routine"
        className="card edge flex items-center justify-between gap-3 pl-5 transition hover:ring-accent/40"
      >
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{strings.plans.myRoutine}</div>
          {data?.routine && data.routine.items.length > 0 ? (
            <div className="font-display text-2xl uppercase">{data.routine.name}</div>
          ) : (
            <div className="text-muted">{strings.plans.myRoutineEmpty}</div>
          )}
          {data?.routine && data.routine.items.length > 0 && (
            <div className="text-sm text-muted">{strings.home.machinesCount(data.routine.items.length)}</div>
          )}
        </div>
        <span className="btn-secondary">{strings.plans.editRoutine}</span>
      </Link>

      <div className="card flex flex-col gap-3 py-4">
        <FilterRow label={strings.plans.goal} value={goal} onChange={setGoal} options={PLAN_GOALS} name={(g) => strings.plans.goals[g]} />
        <FilterRow label={strings.plans.focus} value={focus} onChange={setFocus} options={MUSCLE_GROUPS} name={(g) => strings.muscleGroups[g]} />
      </div>

      {shown.length === 0 && <p className="text-muted">{strings.plans.empty}</p>}
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((plan) => {
          const preview = [...new Set(plan.days.flatMap((d) => d.items.map((i) => i.machineId)))].slice(0, 3);
          return (
            <li key={plan.id}>
              <Link
                to={`/plans/${plan.id}`}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-line/5 transition hover:-translate-y-0.5 hover:ring-accent/50"
              >
                <div className="relative grid grid-cols-3 gap-px bg-line/5">
                  {preview.map((id) => {
                    const machine = data?.machines.get(id);
                    return machine ? (
                      <MachineImage key={id} machine={machine} className="aspect-square w-full rounded-none!" />
                    ) : (
                      <div key={id} className="aspect-square bg-bg" />
                    );
                  })}
                  <span className="absolute top-2 left-0 -skew-x-12 bg-accent px-3 py-0.5 font-display text-sm font-semibold uppercase text-ink">
                    {strings.plans.goals[plan.goal]}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h2 className="font-display text-2xl leading-tight font-semibold uppercase group-hover:text-accent">
                    {plan.name}
                  </h2>
                  <p className="text-sm text-muted">{plan.tagline}</p>
                  <PlanMeta plan={plan} />
                  <div className="mt-auto flex flex-wrap gap-1 pt-1">
                    {plan.focus.map((g) => (
                      <span key={g} className="rounded-md bg-bg px-2 py-0.5 text-xs font-semibold text-text/80">
                        {strings.muscleGroups[g]}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

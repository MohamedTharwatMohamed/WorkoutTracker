import { SchemeBadge, SetTargetsStrip } from '../components/SetPlan';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useParams } from 'react-router';
import { Stripes } from '../components/Art';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MachineImage } from '../components/MachineImage';
import { PageHeader } from '../components/PageHeader';
import * as machineRepository from '../data/machineRepository';
import { getPlan, type Plan, type PlanDay } from '../data/plans';
import * as routineRepository from '../data/routineRepository';
import * as sessionRepository from '../data/sessionRepository';
import { logError } from '../platform/errorLog';
import { strings } from '../strings';
import { PlanMeta } from './PlansScreen';

const routineName = (plan: Plan, day: PlanDay) => (plan.days.length > 1 ? `${plan.name} · ${day.name}` : plan.name);

export function PlanDetailScreen() {
  const { id = '' } = useParams();
  const plan = getPlan(id);
  const navigate = useNavigate();
  const [pending, setPending] = useState<{ day: PlanDay; start: boolean } | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const data = useLiveQuery(async () => {
    if (!plan) return null;
    const ids = [...new Set(plan.days.flatMap((d) => d.items.map((i) => i.machineId)))];
    const [machines, routine, open] = await Promise.all([
      machineRepository.getMany(ids),
      routineRepository.peek(),
      sessionRepository.getOpen(),
    ]);
    return { machines: new Map(machines.map((m) => [m.id, m])), routine: routine ?? null, open: open ?? null };
  }, [id]);

  if (!plan) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-muted">{strings.plans.notFound}</p>
        <Link to="/plans" className="btn-secondary self-start">
          ← {strings.plans.back}
        </Link>
      </div>
    );
  }
  if (!data) return null;

  const apply = async (day: PlanDay, start: boolean) => {
    setPending(null);
    setMessage(null);
    if (start && data.open) return setMessage({ text: strings.plans.sessionOpen, error: true });
    setBusy(true);
    try {
      await routineRepository.replace(routineName(plan, day), day.items);
      if (start) {
        await sessionRepository.create();
        navigate('/session');
      } else {
        setMessage({ text: strings.plans.applied, error: false });
      }
    } catch (error) {
      setMessage({ text: strings.common.notSaved, error: true });
      void logError('plan.apply', error);
    } finally {
      setBusy(false);
    }
  };

  const request = (day: PlanDay, start: boolean) => {
    const current = data.routine;
    const same = current?.name === routineName(plan, day);
    if (current && current.items.length > 0 && !same) setPending({ day, start });
    else void apply(day, start);
  };

  return (
    <div className="flex flex-col gap-5">
      <Link to="/plans" className="self-start text-sm font-semibold text-accent">
        ← {strings.plans.back}
      </Link>
      <PageHeader title={plan.name} tagline={strings.plans.goals[plan.goal]} word={plan.goal} />

      <section className="card relative isolate flex flex-col gap-3 overflow-hidden">
        <Stripes className="absolute top-0 -right-6 -z-10 h-full w-28 -skew-x-[24deg] opacity-20" />
        <p className="max-w-2xl text-lg">{plan.description}</p>
        <PlanMeta plan={plan} />
        <div className="flex flex-wrap gap-1">
          {plan.focus.map((g) => (
            <span key={g} className="rounded-md bg-bg px-2 py-0.5 text-xs font-semibold">
              {strings.muscleGroups[g]}
            </span>
          ))}
        </div>
        {message && (
          <p role={message.error ? 'alert' : 'status'} className={`text-sm ${message.error ? 'text-danger' : 'text-success'}`}>
            {message.text}{' '}
            {!message.error && (
              <Link to="/routine" className="underline">
                {strings.plans.editRoutine}
              </Link>
            )}
            {message.error && data.open && (
              <Link to="/session" className="underline">
                {strings.today.resume}
              </Link>
            )}
          </p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {plan.days.map((day, index) => (
          <section key={day.name} className="card flex flex-col gap-3">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-4xl leading-none font-bold text-accent">{String(index + 1).padStart(2, '0')}</span>
              <h2 className="font-display text-2xl uppercase">{day.name}</h2>
            </div>
            <ol className="flex flex-col gap-2">
              {day.items.map((item) => {
                const machine = data.machines.get(item.machineId);
                if (!machine) return null;
                return (
                  <li key={item.machineId}>
                    <Link to={`/machines/${machine.id}`} className="flex items-center gap-3 rounded-xl p-1 hover:bg-bg">
                      <MachineImage machine={machine} className="size-16" />
                      <div className="flex-1">
                        <div className="font-semibold">{machine.name}</div>
                        <div className="text-xs text-muted">{strings.muscleGroups[machine.muscleGroup]}</div>
                      </div>
                      <span className="flex flex-col items-end gap-1">
                        <span className="font-display text-xl tabular-nums">{strings.today.target(item.targetSets, item.targetReps)}</span>
                        <SchemeBadge item={item} />
                      </span>
                      <SetTargetsStrip item={item} className="hidden sm:flex" />
                    </Link>
                  </li>
                );
              })}
            </ol>
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              <button type="button" className="btn-primary flex-1" disabled={busy} onClick={() => request(day, true)}>
                {strings.plans.startNow}
              </button>
              <button type="button" className="btn-secondary flex-1" disabled={busy} onClick={() => request(day, false)}>
                {strings.plans.useRoutine}
              </button>
            </div>
          </section>
        ))}
      </div>

      {(() => {
        const used = [...new Set(plan.days.flatMap((d) => d.items.map((i) => i.scheme ?? 'straight')))];
        return (
          <section className="card flex flex-col gap-3">
            <h2 className="subheading">{strings.plans.setStyles}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {used.map((s) => (
                <li key={s} className="flex items-center gap-3">
                  <SetTargetsStrip item={{ targetSets: 3, targetReps: 10, scheme: s }} className="shrink-0" />
                  <span className="text-sm">
                    <span className="font-semibold">{strings.schemes[s].name}.</span> <span className="text-muted">{strings.schemes[s].how}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })()}

      <ConfirmDialog
        open={pending !== null}
        title={strings.plans.replaceTitle}
        confirmLabel={strings.plans.replace}
        busy={busy}
        onConfirm={() => pending && void apply(pending.day, pending.start)}
        onCancel={() => setPending(null)}
      >
        {strings.plans.replaceText(data.routine?.name ?? '')}
      </ConfirmDialog>
    </div>
  );
}

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useParams } from 'react-router';
import { MachineImage } from '../components/MachineImage';
import { MachinePicker } from '../components/MachinePicker';
import { PageHeader } from '../components/PageHeader';
import { SetTargetsStrip } from '../components/SetPlan';
import { CountStepper, WeightStepper } from '../components/Stepper';
import { useProfile } from '../components/profileContext';
import * as machineRepository from '../data/machineRepository';
import * as planRepository from '../data/planRepository';
import { PLAN_GOALS, PLAN_LEVELS, type PlanGoal, type PlanLevel } from '../data/plans';
import { SET_SCHEMES, type RoutineItem, type SetScheme } from '../data/types';
import { checkPlanDraft, cleanPlanDraft } from '../domain/planDraft';
import { DEFAULT_MINUTES, LIMITS, type PlanDraft } from '../domain/planTemplate';
import { stepKgFor } from '../domain/units';
import { logError } from '../platform/errorLog';
import { strings } from '../strings';
import { DEFAULT_TARGET_REPS } from './MachineDetailScreen';
import { DEFAULT_TARGET_SETS } from './SessionScreen';

const t = strings.planEditor;
const labelClass = 'text-xs uppercase tracking-wide text-muted';

interface DayState {
  key: number;
  name: string;
  items: RoutineItem[];
}

const clamp = (v: number, r: { min: number; max: number }) => Math.min(r.max, Math.max(r.min, v));

const blankPlan = (): PlanDraft => ({
  name: '',
  tagline: '',
  description: '',
  goal: 'muscle',
  level: 'beginner',
  daysPerWeek: 3,
  minutes: DEFAULT_MINUTES,
  days: [{ name: t.defaultDay(1), items: [] }],
});

export function PlanEditorScreen() {
  const { id } = useParams();
  const data = useLiveQuery(async () => {
    const [plan, all] = await Promise.all([id ? planRepository.get(id) : undefined, planRepository.list()]);
    return {
      plan: plan ?? null,
      taken: all.filter((p) => p.id !== id).map((p) => p.name),
    };
  }, [id]);
  if (!data) return null;
  if (id && !data.plan) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-muted">{strings.plans.notFound}</p>
        <Link to="/plans" className="btn-secondary self-start">
          ← {strings.plans.back}
        </Link>
      </div>
    );
  }
  return <Editor key={id ?? 'new'} id={id} initial={data.plan ?? blankPlan()} taken={data.taken} />;
}

function Editor({ id, initial, taken }: { id?: string; initial: PlanDraft; taken: string[] }) {
  const profile = useProfile();
  const navigate = useNavigate();
  const [name, setName] = useState(initial.name);
  const [tagline, setTagline] = useState(initial.tagline);
  const [description, setDescription] = useState(initial.description);
  const [goal, setGoal] = useState<PlanGoal>(initial.goal);
  const [level, setLevel] = useState<PlanLevel>(initial.level);
  const [daysPerWeek, setDaysPerWeek] = useState(initial.daysPerWeek);
  const [minutes, setMinutes] = useState(String(initial.minutes));
  const [days, setDays] = useState<DayState[]>(() => initial.days.map((d, i) => ({ key: i, name: d.name, items: d.items })));
  const [nextKey, setNextKey] = useState(initial.days.length);
  const [picking, setPicking] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const ids = [...new Set(days.flatMap((d) => d.items.map((i) => i.machineId)))];
  const machines = useLiveQuery(async () => {
    const list = await machineRepository.getMany(ids);
    return new Map(list.map((m) => [m.id, m]));
  }, [ids.join(',')]);

  const updateDay = (key: number, patch: (day: DayState) => DayState) => setDays((all) => all.map((d) => (d.key === key ? patch(d) : d)));
  const updateItem = (key: number, machineId: string, patch: Partial<RoutineItem>) =>
    updateDay(key, (d) => ({
      ...d,
      items: d.items.map((item) => {
        if (item.machineId !== machineId) return item;
        const updated = { ...item, ...patch };
        if ('targetWeightKg' in patch && patch.targetWeightKg === undefined) delete updated.targetWeightKg;
        if ('scheme' in patch && patch.scheme === undefined) delete updated.scheme;
        return updated;
      }),
    }));
  const moveItem = (key: number, index: number, by: -1 | 1) =>
    updateDay(key, (d) => {
      const items = [...d.items];
      [items[index], items[index + by]] = [items[index + by]!, items[index]!];
      return { ...d, items };
    });

  const addDay = () => {
    setDays((all) => [...all, { key: nextKey, name: t.defaultDay(all.length + 1), items: [] }]);
    setNextKey((k) => k + 1);
  };

  const save = async () => {
    const draft = cleanPlanDraft({
      name,
      tagline,
      description,
      goal,
      level,
      daysPerWeek,
      minutes: Number(minutes.trim() || NaN),
      days: days.map((d) => ({ name: d.name, items: d.items })),
    });
    const problems = checkPlanDraft(draft, taken);
    setErrors(problems);
    if (problems.length > 0) return;
    setBusy(true);
    try {
      const saved = await planRepository.save(draft, id);
      navigate(`/plans/${saved}`, { replace: true });
    } catch (error) {
      setErrors([strings.common.notSaved]);
      void logError('plan.save', error);
      setBusy(false);
    }
  };

  const pickingDay = days.find((d) => d.key === picking);

  return (
    <>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Link to={id ? `/plans/${id}` : '/plans'} className="self-start text-sm font-semibold text-accent">
          ← {strings.plans.back}
        </Link>
        <PageHeader title={id ? t.editTitle : t.newTitle} tagline={t.tagline} word="Build" />

        <section className="card flex flex-col gap-4">
          <h2 className="subheading">{t.details}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className={labelClass}>{t.name}</span>
              <input className="field" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className={labelClass}>{t.taglineField}</span>
              <input className="field" value={tagline} maxLength={120} onChange={(e) => setTagline(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className={labelClass}>{t.description}</span>
              <textarea className="field min-h-20" value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>{t.goal}</span>
              <select className="field" value={goal} onChange={(e) => setGoal(e.target.value as PlanGoal)}>
                {PLAN_GOALS.map((g) => (
                  <option key={g} value={g}>
                    {strings.plans.goals[g]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>{t.level}</span>
              <select className="field" value={level} onChange={(e) => setLevel(e.target.value as PlanLevel)}>
                {PLAN_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {strings.plans.levels[l]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>{t.daysPerWeek}</span>
              <select className="field" value={daysPerWeek} onChange={(e) => setDaysPerWeek(Number(e.target.value))}>
                {Array.from({ length: LIMITS.daysPerWeek.max }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>{t.minutes}</span>
              <input className="field" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            </label>
          </div>
        </section>

        <h2 className="subheading">{t.days}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {days.map((day, dayIndex) => (
            <section key={day.key} className="card flex flex-col gap-3" aria-label={day.name || t.dayName}>
              <div className="flex items-center gap-3">
                <span className="font-display text-4xl leading-none font-bold text-accent">{String(dayIndex + 1).padStart(2, '0')}</span>
                <label className="flex flex-1 flex-col gap-1">
                  <span className={labelClass}>{t.dayName}</span>
                  <input
                    className="field"
                    value={day.name}
                    maxLength={40}
                    onChange={(e) =>
                      updateDay(day.key, (d) => ({
                        ...d,
                        name: e.target.value,
                      }))
                    }
                  />
                </label>
                <button
                  type="button"
                  className="btn-danger self-end"
                  aria-label={t.removeDay}
                  disabled={days.length === 1}
                  onClick={() => setDays((all) => all.filter((d) => d.key !== day.key))}
                >
                  ✕
                </button>
              </div>
              {day.items.length === 0 && <p className="text-sm text-muted">{t.noMachines}</p>}
              <ol className="flex flex-col gap-3">
                {day.items.map((item, index) => {
                  const machine = machines?.get(item.machineId);
                  if (!machine) return null;
                  const stepKg = stepKgFor(
                    {
                      ownStepKg: machine.ownStepKg,
                      catalogStepKg: machine.weightStepKg,
                    },
                    profile.weightUnit,
                  );
                  return (
                    <li key={item.machineId} className="flex flex-col gap-3 rounded-xl bg-bg p-3">
                      <div className="flex items-center gap-3">
                        <MachineImage machine={machine} className="size-12" />
                        <span className="flex-1 font-semibold">{machine.name}</span>
                        <button
                          type="button"
                          className="btn-icon"
                          aria-label={strings.common.moveUp}
                          disabled={index === 0}
                          onClick={() => moveItem(day.key, index, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          aria-label={strings.common.moveDown}
                          disabled={index === day.items.length - 1}
                          onClick={() => moveItem(day.key, index, 1)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="btn-danger"
                          aria-label={`${strings.common.remove} ${machine.name}`}
                          onClick={() =>
                            updateDay(day.key, (d) => ({
                              ...d,
                              items: d.items.filter((i) => i.machineId !== item.machineId),
                            }))
                          }
                        >
                          ✕
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <CountStepper
                          label={strings.routine.targetSets}
                          value={item.targetSets}
                          min={LIMITS.sets.min}
                          onChange={(v) =>
                            updateItem(day.key, item.machineId, {
                              targetSets: clamp(v, LIMITS.sets),
                            })
                          }
                        />
                        <CountStepper
                          label={strings.routine.targetReps}
                          value={item.targetReps}
                          min={LIMITS.reps.min}
                          onChange={(v) =>
                            updateItem(day.key, item.machineId, {
                              targetReps: clamp(v, LIMITS.reps),
                            })
                          }
                        />
                      </div>
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="text-muted">{strings.routine.scheme}</span>
                        <select
                          className="field"
                          value={item.scheme ?? 'straight'}
                          onChange={(e) => {
                            const scheme = e.target.value as SetScheme;
                            updateItem(day.key, item.machineId, {
                              scheme: scheme === 'straight' ? undefined : scheme,
                            });
                          }}
                        >
                          {SET_SCHEMES.map((s) => (
                            <option key={s} value={s}>
                              {strings.schemes[s].name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="flex items-end gap-3">
                        <p className="flex-1 text-xs text-muted">{strings.schemes[item.scheme ?? 'straight'].how}</p>
                        <SetTargetsStrip item={item} />
                      </div>
                      <WeightStepper
                        label={strings.routine.targetWeight}
                        valueKg={item.targetWeightKg ?? null}
                        unit={profile.weightUnit}
                        stepKg={stepKg}
                        onChange={(kg) =>
                          updateItem(day.key, item.machineId, {
                            targetWeightKg: clamp(kg, LIMITS.weightKg),
                          })
                        }
                      />
                      {item.targetWeightKg !== undefined && (
                        <button
                          type="button"
                          className="btn-secondary self-start"
                          onClick={() =>
                            updateItem(day.key, item.machineId, {
                              targetWeightKg: undefined,
                            })
                          }
                        >
                          {strings.routine.clearWeight}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>
              <button type="button" className="btn-secondary mt-auto" onClick={() => setPicking(day.key)}>
                + {t.addMachine}
              </button>
            </section>
          ))}
        </div>
        <button type="button" className="btn-secondary self-start" disabled={days.length >= LIMITS.daysPerWeek.max} onClick={addDay}>
          + {t.addDay}
        </button>

        {errors.length > 0 && (
          <ul role="alert" className="list-disc pl-5 text-sm text-danger">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Link to={id ? `/plans/${id}` : '/plans'} className="btn-secondary">
            {strings.common.cancel}
          </Link>
          <button type="submit" className="btn-primary flex-1" disabled={busy}>
            {t.save}
          </button>
        </div>
      </form>

      <MachinePicker
        open={picking !== null}
        exclude={pickingDay?.items.map((i) => i.machineId) ?? []}
        onClose={() => setPicking(null)}
        onPick={(machineId) => {
          const key = picking;
          setPicking(null);
          if (key === null) return;
          updateDay(key, (d) => ({
            ...d,
            items: [
              ...d.items,
              {
                machineId,
                targetSets: DEFAULT_TARGET_SETS,
                targetReps: DEFAULT_TARGET_REPS,
              },
            ],
          }));
        }}
      />
    </>
  );
}

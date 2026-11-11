import { checkInStatus } from '../domain/checkIn';
import { SchemeBadge } from '../components/SetPlan';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router';
import { HeroPhoto, Stripes } from '../components/Art';
import { BodyMap } from '../components/BodyMap';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MachineImage } from '../components/MachineImage';
import { useProfile } from '../components/profileContext';
import * as machineRepository from '../data/machineRepository';
import * as measurementRepository from '../data/measurementRepository';
import * as routineRepository from '../data/routineRepository';
import * as sessionRepository from '../data/sessionRepository';
import * as setRepository from '../data/setRepository';
import { MUSCLE_GROUPS } from '../data/types';
import { setsByMuscle, volumeKg, weeklyActivity, weekStreak, WEEKLY_SET_TARGET } from '../domain/progress';
import { isStale } from '../domain/sessionMachine';
import { change, series } from '../domain/trends';
import { formatDate, formatNumber, formatWeight, kgToDisplay } from '../format';
import { motivationOfDay } from '../motivation';
import { logError } from '../platform/errorLog';
import { strings } from '../strings';

const DAY_MS = 24 * 60 * 60 * 1000;
const STREAK_WEEKS = 26;

async function loadHome() {
  const now = new Date();
  const nowIso = now.toISOString();
  const since = new Date(now.getTime() - STREAK_WEEKS * 7 * DAY_MS).toISOString();
  const [routine, open, sessions, sets, weights, lastMeasured] = await Promise.all([
    routineRepository.peek(),
    sessionRepository.getOpen(),
    sessionRepository.listSince(since),
    setRepository.listSince(since),
    measurementRepository.series('weight'),
    measurementRepository.recent(1),
  ]);
  const items = routine?.items ?? [];
  const machines = await machineRepository.getMany([
    ...new Set([...items.map((i) => i.machineId), ...sets.map((s) => s.machineId)]),
  ]);
  const byId = new Map(machines.map((m) => [m.id, m]));
  const weeks = weeklyActivity(sessions, sets, nowIso, STREAK_WEEKS);
  const weekAgo = now.getTime() - 7 * DAY_MS;
  const weightPoints = series(weights);
  return {
    routineName: routine?.name ?? '',
    items: items.map((item) => ({ item, machine: byId.get(item.machineId)! })),
    open: open ?? null,
    week: weeks.at(-1)!,
    streak: weekStreak(weeks),
    muscles: setsByMuscle(
      sets.filter((s) => Date.parse(s.loggedAt) > weekAgo),
      (id) => byId.get(id)?.muscleGroup,
    ),
    recent: sessions
      .filter((s) => s.state === 'finished')
      .sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''))
      .slice(0, 4)
      .map((session) => {
        const own = sets.filter((s) => s.sessionId === session.id);
        return { session, sets: own.length, machines: new Set(own.map((s) => s.machineId)).size, volume: volumeKg(own) };
      }),
    weight: { latest: weightPoints.at(-1), change: change(weightPoints) },
    lastMeasuredAt: lastMeasured[0]?.takenAt,
  };
}

export function HomeScreen() {
  const profile = useProfile();
  const navigate = useNavigate();
  const data = useLiveQuery(loadHome, []);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!data) return null;
  const { items, open, week, streak, muscles, recent, weight, lastMeasuredAt } = data;
  const checkIn = profile.checkInDay === undefined ? null : checkInStatus(profile.checkInDay, lastMeasuredAt);
  const stale = open !== null && isStale(open, new Date().toISOString());
  const unit = profile.weightUnit;
  const volume = (kg: number) => `${formatNumber(kgToDisplay(kg, unit), 0)} ${unit}`;

  const start = async () => {
    setBusy(true);
    try {
      if (!open) await sessionRepository.create();
      navigate('/session');
    } catch (error) {
      void logError('session.create', error);
    } finally {
      setBusy(false);
    }
  };

  const closeStale = async () => {
    if (!open) return;
    setBusy(true);
    try {
      await sessionRepository.transition(open.id, { type: open.state === 'notStarted' ? 'discard' : 'finish' });
    } catch (error) {
      void logError('session.close', error);
    } finally {
      setBusy(false);
      setConfirmDiscard(false);
    }
  };

  const stats = [
    [strings.home.workouts, formatNumber(week.sessions)],
    [strings.home.sets, formatNumber(week.sets)],
    [strings.home.volume, volume(week.volumeKg)],
    [strings.home.streak, formatNumber(streak)],
  ] as const;

  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-3 lg:items-start">
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-surface via-surface to-accent/25 min-h-64 p-5 ring-1 ring-line/10 lg:col-span-3 lg:p-8">
        <Stripes className="absolute top-0 right-16 -z-10 h-full w-40 -skew-x-[24deg] opacity-25" />
        <span aria-hidden className="text-outline absolute -bottom-6 left-2 -z-10 font-display text-[7rem] leading-none font-bold whitespace-nowrap uppercase lg:text-[11rem]">
          {strings.home.thisWeek}
        </span>
        <HeroPhoto photo="tirePush" className="absolute inset-y-0 right-0 -z-10 h-full w-[48%] object-[center_30%]! sm:w-[42%] lg:w-[34%]" />
        <Link to="/settings" className="btn-icon absolute top-4 right-4 lg:hidden" aria-label={strings.nav.settings}>
          ⚙
        </Link>
        <div className="flex max-w-[62%] flex-col gap-4 sm:max-w-md">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
              {strings.home.greeting(new Date().getHours())}
            </p>
            <h1 className="mt-1 font-display text-5xl leading-[0.9] font-bold uppercase lg:text-7xl">
              {motivationOfDay()}
              <span className="text-accent">.</span>
            </h1>
            <div className="slash mt-3" />
          </div>
          {open && stale ? (
            <div className="flex flex-col gap-2">
              <p className="font-semibold">{strings.today.unfinished(formatDate(open.startedAt ?? open.createdAt))}</p>
              <div className="flex flex-wrap gap-2">
                <Link to="/session" className="btn-primary">
                  {strings.today.resume}
                </Link>
                <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirmDiscard(true)}>
                  {open.state === 'notStarted' ? strings.today.discard : strings.today.finish}
                </button>
              </div>
            </div>
          ) : open ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted">{open.state === 'notStarted' ? strings.today.planned : strings.today.inProgress}</p>
              <Link to="/session" className="btn-primary min-h-14 self-start px-6 text-xl">
                {strings.today.resume} →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {items.length > 0 ? (
                <p className="text-sm text-muted">
                  <span className="font-semibold text-text">{data.routineName}</span> · {strings.home.machinesCount(items.length)}
                </p>
              ) : (
                <p className="text-sm text-muted">{strings.home.noRoutine}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary min-h-14 px-6 text-xl" disabled={busy} onClick={() => void start()}>
                  {strings.today.startSession} →
                </button>
                {items.length === 0 && (
                  <Link to="/plans" className="btn-secondary min-h-14">
                    {strings.home.browsePlans}
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-3" aria-label={strings.home.thisWeek}>
        {stats.map(([label, value]) => (
          <div key={label} className="card edge pl-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
            <div className="font-display text-3xl tabular-nums text-accent lg:text-4xl">{value}</div>
          </div>
        ))}
      </section>

      <section className="card flex flex-col gap-3 lg:col-span-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="subheading">{strings.home.nextUp}</h2>
          <Link to="/routine" className="text-sm font-semibold text-accent">
            {strings.today.editRoutine} →
          </Link>
        </div>
        {items.length === 0 ? (
          <p className="text-muted">{strings.home.noRoutine}</p>
        ) : (
          <ol className="no-scrollbar -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
            {items.map(({ item, machine }, i) => (
              <li key={item.machineId} className="w-36 shrink-0 snap-start">
                <Link to={`/machines/${machine.id}`} className="flex flex-col gap-1">
                  <div className="relative">
                    <MachineImage machine={machine} className="aspect-square w-full" />
                    <span className="absolute top-1 left-1 rounded-md bg-bg/85 px-1.5 font-display text-sm text-accent">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="line-clamp-2 text-sm leading-tight font-semibold">{machine.name}</span>
                  <span className="font-display text-sm tabular-nums text-muted">
                    {strings.today.target(item.targetSets, item.targetReps)}
                    {item.targetWeightKg !== undefined && ` · ${formatWeight(item.targetWeightKg, unit)}`}
                  </span>
                  <SchemeBadge item={item} />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="subheading">{strings.home.bodyTitle}</h2>
          <Link to="/body" className="text-sm font-semibold text-accent">
            {strings.home.logBody} →
          </Link>
        </div>
        <Link
          to="/body#check-in"
          className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${checkIn?.state === 'due' ? 'bg-accent text-ink' : 'bg-bg/60 ring-1 ring-line/10'}`}
        >
          <span>
            📏{' '}
            {checkIn === null
              ? strings.home.setCheckIn
              : checkIn.state === 'due'
                ? strings.body.checkInDue(checkIn.overdueDays)
                : strings.body.checkInDone(checkIn.nextInDays)}
          </span>
          <span aria-hidden>→</span>
        </Link>
        {weight.latest ? (
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">{strings.home.latestWeight}</div>
              <div className="font-display text-4xl tabular-nums">{formatWeight(weight.latest.value, unit)}</div>
              <div className="text-xs text-muted">{formatDate(weight.latest.date)}</div>
            </div>
            {weight.change !== null && weight.change !== 0 && (
              <div className="font-display text-2xl tabular-nums text-accent">
                {weight.change > 0 ? '+' : ''}
                {formatNumber(kgToDisplay(weight.change, unit))} {unit}
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted">{strings.home.noWeight}</p>
        )}
      </section>

      <section className="card flex flex-col gap-3 lg:col-span-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="subheading">{strings.home.muscleTitle}</h2>
            <p className="text-xs text-muted">{strings.home.muscleHint}</p>
          </div>
          <Link to="/progress" className="text-sm font-semibold text-accent">
            {strings.home.seeProgress} →
          </Link>
        </div>
        <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,14rem)_1fr]">
          <BodyMap
            className="mx-auto w-full max-w-56"
            levels={Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, muscles[g] / WEEKLY_SET_TARGET.high]))}
          />
          <ul className="flex flex-col gap-2">
            {MUSCLE_GROUPS.map((g) => (
              <li key={g} className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-2 text-sm">
                <span className="font-semibold">{strings.muscleGroups[g]}</span>
                <span className="h-2 overflow-hidden rounded-full bg-bg">
                  <span
                    className="block h-full -skew-x-12 bg-accent"
                    style={{ width: `${Math.min(100, (muscles[g] / WEEKLY_SET_TARGET.high) * 100)}%` }}
                  />
                </span>
                <span className="text-right font-display tabular-nums">{muscles[g]}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card flex flex-col gap-2">
        <h2 className="subheading">{strings.home.recentTitle}</h2>
        {recent.length === 0 && <p className="text-muted">{strings.home.noRecent}</p>}
        <ul className="flex flex-col divide-y divide-line/5">
          {recent.map((r) => (
            <li key={r.session.id} className="flex items-center gap-3 py-2">
              <span className="grid size-11 place-items-center rounded-lg bg-accent/15 font-display text-accent">
                {new Date(r.session.startedAt ?? r.session.createdAt).getDate()}
              </span>
              <div className="flex-1">
                <div className="font-semibold">{formatDate(r.session.startedAt ?? r.session.createdAt)}</div>
                <div className="text-xs text-muted">
                  {strings.home.machinesCount(r.machines)} · {strings.home.setsCount(r.sets)}
                </div>
              </div>
              <span className="font-display tabular-nums text-muted">{volume(r.volume)}</span>
            </li>
          ))}
        </ul>
      </section>

      <ConfirmDialog
        open={confirmDiscard}
        title={open?.state === 'notStarted' ? strings.session.discardTitle : strings.session.finishTitle}
        confirmLabel={open?.state === 'notStarted' ? strings.today.discard : strings.today.finish}
        danger={open?.state === 'notStarted'}
        busy={busy}
        onConfirm={() => void closeStale()}
        onCancel={() => setConfirmDiscard(false)}
      >
        {open?.state === 'notStarted' ? strings.session.discardText : strings.session.finishText}
      </ConfirmDialog>
    </div>
  );
}

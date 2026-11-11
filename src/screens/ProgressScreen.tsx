import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { BodyMap } from '../components/BodyMap';
import { MachineImage } from '../components/MachineImage';
import { PageHeader } from '../components/PageHeader';
import TrendChart from '../components/TrendChart';
import { useProfile } from '../components/profileContext';
import * as machineRepository from '../data/machineRepository';
import * as measurementRepository from '../data/measurementRepository';
import * as sessionRepository from '../data/sessionRepository';
import * as setRepository from '../data/setRepository';
import { MUSCLE_GROUPS, type Site } from '../data/types';
import {
  setsByMuscle,
  strengthChanges,
  strengthSeries,
  volumeKg,
  weeklyActivity,
  weekStreak,
  WEEKLY_SET_TARGET,
} from '../domain/progress';
import { change, series } from '../domain/trends';
import { cmToDisplay, formatNumber, kgToDisplay } from '../format';
import { strings } from '../strings';

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGES = [7, 28, 90] as const;
const HISTORY_DAYS = 365;
const BODY_SITES: readonly Site[] = ['weight', 'waist', 'chest', 'hips'];

async function loadProgress() {
  const now = new Date();
  const since = new Date(now.getTime() - HISTORY_DAYS * DAY_MS).toISOString();
  const [sessions, sets, body] = await Promise.all([
    sessionRepository.listSince(since),
    setRepository.listSince(since),
    Promise.all(BODY_SITES.map((site) => measurementRepository.series(site))),
  ]);
  const machines = await machineRepository.getMany([...new Set(sets.map((s) => s.machineId))]);
  return {
    now: now.toISOString(),
    sessions,
    sets,
    machines: new Map(machines.map((m) => [m.id, m])),
    body: BODY_SITES.map((site, i) => ({ site, points: series(body[i]!) })),
  };
}

export default function ProgressScreen() {
  const profile = useProfile();
  const [range, setRange] = useState<(typeof RANGES)[number]>(28);
  const [picked, setPicked] = useState<string | null>(null);
  const data = useLiveQuery(loadProgress, []);
  if (!data) return null;

  const unit = profile.weightUnit;
  const from = Date.parse(data.now) - range * DAY_MS;
  const rangeSets = data.sets.filter((s) => Date.parse(s.loggedAt) > from);
  const rangeSessions = data.sessions.filter(
    (s) => s.state !== 'notStarted' && s.startedAt && Date.parse(s.startedAt) > from,
  );
  const weeksInRange = range / 7;
  const muscles = setsByMuscle(rangeSets, (id) => data.machines.get(id)?.muscleGroup);
  const perWeek = (n: number) => n / weeksInRange;
  const weeks = weeklyActivity(data.sessions, data.sets, data.now, 8);
  const streak = weekStreak(weeklyActivity(data.sessions, data.sets, data.now, 52));
  const maxWeek = Math.max(1, ...weeks.map((w) => w.sessions));
  const changes = strengthChanges(data.sets);
  const machineId = picked ?? changes[0]?.machineId ?? null;
  const strength = machineId
    ? strengthSeries(data.sets, machineId).map((p) => ({ date: p.date, value: kgToDisplay(p.value, unit) }))
    : [];
  const status = (sets: number) =>
    sets < WEEKLY_SET_TARGET.low ? strings.progress.under : sets > WEEKLY_SET_TARGET.high ? strings.progress.over : strings.progress.onTarget;
  const scale = WEEKLY_SET_TARGET.high * 1.25;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={strings.progress.title}
        tagline={strings.progress.tagline}
        word="Gains"
        actions={
          <div className="flex rounded-xl bg-surface p-1 ring-1 ring-line/10" role="group">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={range === r}
                className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${range === r ? 'bg-accent text-ink' : 'text-muted'}`}
                onClick={() => setRange(r)}
              >
                {strings.progress.range(r)}
              </button>
            ))}
          </div>
        }
      />

      {rangeSessions.length === 0 && <p className="card edge pl-5 text-muted">{strings.progress.empty}</p>}

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <section className="card flex flex-col gap-4">
          <div>
            <h2 className="subheading">{strings.progress.muscleTitle}</h2>
            <p className="text-xs text-muted">{strings.progress.muscleHint(WEEKLY_SET_TARGET.low, WEEKLY_SET_TARGET.high)}</p>
          </div>
          <BodyMap
            className="mx-auto w-full max-w-72"
            levels={Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, perWeek(muscles[g]) / WEEKLY_SET_TARGET.high]))}
          />
          <ul className="flex flex-col gap-3">
            {MUSCLE_GROUPS.map((g) => {
              const value = perWeek(muscles[g]);
              return (
                <li key={g} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-semibold">{strings.muscleGroups[g]}</span>
                    <span className="text-muted">
                      <span className="font-display text-base text-text tabular-nums">{formatNumber(value)}</span>{' '}
                      {strings.progress.perWeek} · {status(value)}
                    </span>
                  </div>
                  <div className="relative h-3 overflow-hidden rounded-full bg-bg">
                    <div
                      className="absolute inset-y-0 bg-line/10"
                      style={{
                        left: `${(WEEKLY_SET_TARGET.low / scale) * 100}%`,
                        width: `${((WEEKLY_SET_TARGET.high - WEEKLY_SET_TARGET.low) / scale) * 100}%`,
                      }}
                    />
                    <div
                      className="relative h-full -skew-x-12 bg-accent"
                      style={{ width: `${Math.min(100, (value / scale) * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="flex flex-col gap-5">
          <section className="card flex flex-col gap-4">
            <h2 className="subheading">{strings.progress.routineTitle}</h2>
            <dl className="grid grid-cols-3 gap-3">
              {(
                [
                  [strings.progress.totalWorkouts, formatNumber(rangeSessions.length)],
                  [strings.progress.totalVolume, `${formatNumber(kgToDisplay(volumeKg(rangeSets), unit), 0)} ${unit}`],
                  [strings.progress.streak, formatNumber(streak)],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-xl bg-bg p-3">
                  <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
                  <dd className="font-display text-2xl tabular-nums text-accent">{value}</dd>
                </div>
              ))}
            </dl>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-muted">{strings.progress.workoutsPerWeek}</p>
              <div className="flex h-32 items-end gap-2">
                {weeks.map((w) => (
                  <div key={w.start} className="flex flex-1 flex-col items-center gap-1">
                    <span className="font-display text-sm tabular-nums">{w.sessions}</span>
                    <div
                      className={`w-full -skew-x-6 rounded-t ${w.sessions > 0 ? 'bg-accent' : 'bg-line/10'}`}
                      style={{ height: `${Math.max(4, (w.sessions / maxWeek) * 96)}px` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="card flex flex-col gap-3">
            <div>
              <h2 className="subheading">{strings.progress.strengthTitle}</h2>
              <p className="text-xs text-muted">{strings.progress.strengthHint}</p>
            </div>
            {changes.length === 0 ? (
              <p className="text-muted">{strings.progress.noStrength}</p>
            ) : (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-muted">{strings.progress.machine}</span>
                  <select className="field" value={machineId ?? ''} onChange={(e) => setPicked(e.target.value)}>
                    {changes.map((c) => (
                      <option key={c.machineId} value={c.machineId}>
                        {data.machines.get(c.machineId)?.name ?? c.machineId}
                      </option>
                    ))}
                  </select>
                </label>
                {strength.length >= 2 ? (
                  <TrendChart points={strength} unit={unit} />
                ) : (
                  <p className="text-sm text-muted">{strings.progress.noStrength}</p>
                )}
                <ul className="flex flex-col divide-y divide-line/5">
                  {changes.slice(0, 5).map((c) => {
                    const machine = data.machines.get(c.machineId);
                    const delta = c.latestKg - c.firstKg;
                    return (
                      <li key={c.machineId} className="flex items-center gap-3 py-2">
                        {machine && <MachineImage machine={machine} className="size-12" />}
                        <span className="flex-1 text-sm font-semibold">{machine?.name}</span>
                        <span className="text-right text-xs text-muted">
                          {strings.progress.best}{' '}
                          <span className="font-display text-base text-text">{formatNumber(kgToDisplay(c.bestKg, unit))}</span>
                        </span>
                        <span className={`w-16 text-right font-display tabular-nums ${delta > 0 ? 'text-accent' : 'text-muted'}`}>
                          {delta > 0 ? '+' : ''}
                          {formatNumber(kgToDisplay(delta, unit))}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
        </div>
      </div>

      <section className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="subheading">{strings.progress.bodyTitle}</h2>
          <Link to="/body" className="text-sm font-semibold text-accent">
            {strings.progress.openBody} →
          </Link>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.body.map(({ site, points }) => {
            const latest = points.at(-1);
            const delta = change(points);
            const show = (v: number) => (site === 'weight' ? kgToDisplay(v, unit) : cmToDisplay(v, profile.lengthUnit));
            const u = site === 'weight' ? unit : profile.lengthUnit;
            return (
              <div key={site} className="rounded-xl bg-bg p-3">
                <dt className="text-xs uppercase tracking-wide text-muted">{strings.sites[site]}</dt>
                <dd className="font-display text-2xl tabular-nums">
                  {latest ? `${formatNumber(show(latest.value))} ${u}` : strings.body.noValue}
                </dd>
                {delta !== null && delta !== 0 && (
                  <dd className="text-xs text-accent">
                    {delta > 0 ? '+' : ''}
                    {formatNumber(show(delta))} {u}
                  </dd>
                )}
              </div>
            );
          })}
        </dl>
      </section>
    </div>
  );
}

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MachineImage } from '../components/MachineImage';
import { useProfile } from '../components/profileContext';
import * as machineRepository from '../data/machineRepository';
import * as routineRepository from '../data/routineRepository';
import * as sessionRepository from '../data/sessionRepository';
import * as setRepository from '../data/setRepository';
import { isStale } from '../domain/sessionMachine';
import { USAGE_WINDOW_DAYS, usageSummary } from '../domain/usage';
import { formatDate, formatNumber, formatWeight } from '../format';
import { logError } from '../platform/errorLog';
import { strings } from '../strings';

const DAY_MS = 24 * 60 * 60 * 1000;

async function loadToday() {
  const now = new Date();
  const since = new Date(now.getTime() - USAGE_WINDOW_DAYS * DAY_MS).toISOString();
  const [routine, open, sessions, sets] = await Promise.all([
    routineRepository.peek(),
    sessionRepository.getOpen(),
    sessionRepository.listSince(since),
    setRepository.listSince(since),
  ]);
  const items = routine?.items ?? [];
  const machines = await machineRepository.getMany(items.map((i) => i.machineId));
  return {
    items: items.map((item, i) => ({ item, machine: machines[i]! })),
    open: open ?? null,
    usage: usageSummary(sessions, sets, now.toISOString()),
  };
}

export function TodayScreen() {
  const profile = useProfile();
  const navigate = useNavigate();
  const data = useLiveQuery(loadToday, []);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!data) return null;
  const { items, open, usage } = data;
  const stale = open !== null && isStale(open, new Date().toISOString());

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

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start">
      <h1 className="heading lg:col-span-2">{strings.today.title}</h1>

      <section className="card flex flex-col gap-3 bg-gradient-to-br from-accent/20 to-surface">
        {open && stale ? (
          <>
            <p className="font-semibold">{strings.today.unfinished(formatDate(open.startedAt ?? open.createdAt))}</p>
            <div className="flex flex-wrap gap-2">
              <Link to="/session" className="btn-primary flex-1">
                {strings.today.resume}
              </Link>
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirmDiscard(true)}>
                {open.state === 'notStarted' ? strings.today.discard : strings.today.finish}
              </button>
            </div>
          </>
        ) : open ? (
          <>
            <p className="text-sm text-muted">
              {open.state === 'notStarted' ? strings.today.planned : strings.today.inProgress}
            </p>
            <Link to="/session" className="btn-primary">
              {strings.today.resume}
            </Link>
          </>
        ) : (
          <button type="button" className="btn-primary min-h-16 text-2xl" disabled={busy} onClick={() => void start()}>
            {strings.today.startSession}
          </button>
        )}
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="subheading">{strings.today.usageTitle}</h2>
        <dl className="grid grid-cols-2 gap-3">
          {(
            [
              [strings.today.activeDays, usage.activeDays],
              [strings.today.sessions, usage.sessions],
              [strings.today.sets, usage.sets],
              [strings.today.setsPerSession, usage.setsPerSession],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-xl bg-bg p-3">
              <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
              <dd className="font-display text-3xl tabular-nums text-accent">{formatNumber(value)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card flex flex-col gap-3 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="subheading">{strings.today.routineTitle}</h2>
          <Link to="/routine" className="btn-secondary">
            {strings.today.editRoutine}
          </Link>
        </div>
        {items.length === 0 && <p className="text-muted">{strings.today.emptyRoutine}</p>}
        <ol className="flex flex-col gap-2">
          {items.map(({ item, machine }) => (
            <li key={item.machineId}>
              <Link to={`/machines/${machine.id}`} className="flex items-center gap-3 rounded-xl p-1 hover:bg-bg">
                <MachineImage machine={machine} className="size-14" />
                <span className="flex-1 font-semibold">{machine.name}</span>
                <span className="font-display text-lg tabular-nums text-muted">
                  {strings.today.target(item.targetSets, item.targetReps)}
                  {item.targetWeightKg !== undefined && ` · ${formatWeight(item.targetWeightKg, profile.weightUnit)}`}
                </span>
              </Link>
            </li>
          ))}
        </ol>
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

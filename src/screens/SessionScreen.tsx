import { SchemeBadge, setHint } from '../components/SetPlan';
import { setTargets, targetForSet } from '../domain/setScheme';
import { useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router';
import { BackupButton } from '../components/Backup';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MachineImage } from '../components/MachineImage';
import { MachinePicker } from '../components/MachinePicker';
import { RestTimer, useNow } from '../components/RestTimer';
import { SetRow } from '../components/SetRow';
import { useUndo } from '../components/UndoToast';
import { useProfile } from '../components/profileContext';
import * as machineRepository from '../data/machineRepository';
import type { MachineView } from '../data/machineRepository';
import * as metaRepository from '../data/metaRepository';
import * as routineRepository from '../data/routineRepository';
import * as sessionRepository from '../data/sessionRepository';
import * as setRepository from '../data/setRepository';
import type { RoutineItem, Session, SetRecord } from '../data/types';
import { prefill } from '../domain/prefill';
import { restLengthFor } from '../domain/restTimer';
import type { SessionEvent } from '../domain/sessionMachine';
import { stepKgFor } from '../domain/units';
import { formatDuration } from '../format';
import { logError } from '../platform/errorLog';
import { useWakeLock } from '../platform/wakeLock';
import { motivationOfDay } from '../motivation';
import { strings } from '../strings';

export const DEFAULT_TARGET_SETS = 3;
const WAKE_KEY = 'workout-tracker-keep-screen-on';

interface MachineEntry {
  machine: MachineView;
  target?: RoutineItem;
  sets: SetRecord[];
  lastSession: SetRecord[];
}

async function loadSession(finishedId: string | null) {
  const session = finishedId
    ? await sessionRepository.get(finishedId)
    : await sessionRepository.getOpen();
  if (!session) return { session: null } as const;
  const [sets, machines, routine] = await Promise.all([
    setRepository.listBySession(session.id),
    machineRepository.getMany(session.machineOrder),
    routineRepository.peek(),
  ]);
  const lasts = await Promise.all(
    session.machineOrder.map((id) => setRepository.lastForMachine(id, session.id)),
  );
  const entries: MachineEntry[] = machines.map((machine, i) => ({
    machine,
    target: routine?.items.find((item) => item.machineId === machine.id),
    sets: sets.filter((s) => s.machineId === machine.id).sort((a, b) => a.setNumber - b.setNumber),
    lastSession: lasts[i]?.sets ?? [],
  }));
  return { session, sets, entries } as const;
}

function useKeepScreenOn(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem(WAKE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const change = (value: boolean) => {
    setOn(value);
    try {
      localStorage.setItem(WAKE_KEY, value ? '1' : '0');
    } catch {
      // Not remembered; the toggle still works for this visit.
    }
  };
  return [on, change];
}

export function SessionScreen() {
  const [finishedId, setFinishedId] = useState<string | null>(null);
  const data = useLiveQuery(() => loadSession(finishedId), [finishedId]);
  if (!data) return null;
  if (!data.session) {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="heading">{strings.session.title}</h1>
        <p className="text-muted">{strings.session.none}</p>
        <Link to="/" className="btn-primary">
          {strings.session.goToday}
        </Link>
      </div>
    );
  }
  if (data.session.state === 'finished') return <Summary session={data.session} sets={data.sets} />;
  return <OpenSession session={data.session} sets={data.sets} entries={data.entries} onFinished={setFinishedId} />;
}

function OpenSession({
  session,
  sets,
  entries,
  onFinished,
}: {
  session: Session;
  sets: SetRecord[];
  entries: MachineEntry[];
  onFinished: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [picking, setPicking] = useState(false);
  const [confirm, setConfirm] = useState<'discard' | 'finish' | null>(null);
  const [busy, setBusy] = useState(false);
  const [keepScreenOn, setKeepScreenOn] = useKeepScreenOn();
  const started = session.state !== 'notStarted';
  useWakeLock(keepScreenOn && started);

  const act = useCallback(
    async (event: SessionEvent) => {
      try {
        return await sessionRepository.transition(session.id, event);
      } catch (error) {
        void logError(`session.${event.type}`, error);
        return null;
      }
    },
    [session.id],
  );
  const onRestEnded = useCallback(() => void act({ type: 'restEnded' }), [act]);

  const order = session.machineOrder;
  const reorder = async (ids: string[]) => {
    try {
      await sessionRepository.setMachineOrder(session.id, ids);
    } catch (error) {
      void logError('session.order', error);
    }
  };
  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const copy = [...order];
    [copy[index], copy[target]] = [copy[target]!, copy[index]!];
    void reorder(copy);
  };

  const current = session.currentMachineId ?? entries.find((e) => e.sets.length === 0)?.machine.id ?? order[0];

  const finish = async () => {
    setBusy(true);
    if (confirm === 'discard') {
      if (await act({ type: 'discard' })) navigate('/');
    } else if (await act({ type: 'finish' })) {
      onFinished(session.id);
    }
    setBusy(false);
    setConfirm(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative isolate flex items-end justify-between gap-2 overflow-hidden pb-2">
        <span aria-hidden className="text-outline absolute -top-2 right-28 -z-10 font-display text-7xl leading-none font-bold whitespace-nowrap uppercase">
          {motivationOfDay()}
        </span>
        <div>
          <h1 className="heading text-4xl">{strings.session.title}</h1>
          <div aria-hidden className="slash mt-2" />
        </div>
        {started ? (
          <button type="button" className="btn-secondary" onClick={() => setConfirm('finish')}>
            {strings.session.finish}
          </button>
        ) : (
          <button type="button" className="btn-danger" onClick={() => setConfirm('discard')}>
            {strings.session.discard}
          </button>
        )}
      </div>

      {!started && <p className="text-muted">{strings.session.notStartedHint}</p>}

      {session.state === 'resting' && session.restEndsAt && (
        <div className="sticky top-2 z-20">
          <RestTimer
            restEndsAt={session.restEndsAt}
            onAdjust={(deltaSec) => void act({ type: 'restAdjusted', deltaSec })}
            onSkip={() => void act({ type: 'restSkipped' })}
            onEnded={onRestEnded}
            keepScreenOn={keepScreenOn}
            onKeepScreenOnChange={setKeepScreenOn}
          />
        </div>
      )}
      {session.state === 'active' && sets.length > 0 && (
        <SinceLastSet loggedAt={sets.at(-1)!.loggedAt} />
      )}

      {entries.length === 0 && <p className="text-muted">{strings.session.emptyList}</p>}
      <ol className="flex flex-col gap-3">
        {entries.map((entry, index) => (
          <MachineCard
            key={entry.machine.id}
            session={session}
            entry={entry}
            expanded={started && entry.machine.id === current}
            first={index === 0}
            last={index === entries.length - 1}
            onExpand={() => void sessionRepository.setCurrentMachine(session.id, entry.machine.id)}
            onMove={(delta) => move(index, delta)}
            onSkip={() => void reorder(order.filter((id) => id !== entry.machine.id))}
          />
        ))}
      </ol>

      <button type="button" className="btn-secondary" onClick={() => setPicking(true)}>
        + {strings.session.addMachine}
      </button>
      {!started && (
        <button
          type="button"
          className="btn-primary min-h-16 text-2xl"
          disabled={order.length === 0}
          onClick={() => void act({ type: 'start' })}
        >
          {strings.session.start}
        </button>
      )}

      <MachinePicker
        open={picking}
        exclude={order}
        onClose={() => setPicking(false)}
        onPick={(id) => {
          setPicking(false);
          void reorder([...order, id]).then(() =>
            started ? sessionRepository.setCurrentMachine(session.id, id) : undefined,
          );
        }}
      />
      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'discard' ? strings.session.discardTitle : strings.session.finishTitle}
        confirmLabel={confirm === 'discard' ? strings.session.discard : strings.session.finish}
        danger={confirm === 'discard'}
        busy={busy}
        onConfirm={() => void finish()}
        onCancel={() => setConfirm(null)}
      >
        {confirm === 'discard' ? strings.session.discardText : strings.session.finishText}
      </ConfirmDialog>
    </div>
  );
}

function SinceLastSet({ loggedAt }: { loggedAt: string }) {
  const now = useNow();
  return (
    <div className="card flex items-baseline justify-between">
      <span className="text-xs uppercase tracking-wide text-muted">{strings.session.sinceLastSet}</span>
      <span className="font-display text-3xl tabular-nums">
        {formatDuration((now - Date.parse(loggedAt)) / 1000)}
      </span>
    </div>
  );
}

function MachineCard({
  session,
  entry,
  expanded,
  first,
  last,
  onExpand,
  onMove,
  onSkip,
}: {
  session: Session;
  entry: MachineEntry;
  expanded: boolean;
  first: boolean;
  last: boolean;
  onExpand: () => void;
  onMove: (delta: -1 | 1) => void;
  onSkip: () => void;
}) {
  const profile = useProfile();
  const showUndo = useUndo();
  const [extra, setExtra] = useState(0);
  const { machine, target, sets } = entry;
  const targetSets = target?.targetSets ?? DEFAULT_TARGET_SETS;
  const plan = target ? setTargets(target) : [];
  const hintFor = (n: number) => {
    const t = target && targetForSet(plan, n);
    return t ? setHint(t, target, profile.weightUnit) : undefined;
  };
  const started = session.state !== 'notStarted';
  const drafts = Math.max(targetSets - sets.length, 0) + extra;
  const nextNumber = Math.max(0, ...sets.map((s) => s.setNumber)) + 1;
  const stepKg = stepKgFor({ ownStepKg: machine.ownStepKg, catalogStepKg: machine.weightStepKg }, profile.weightUnit);

  const [wasExpanded, setWasExpanded] = useState(expanded);
  if (wasExpanded !== expanded) {
    setWasExpanded(expanded);
    if (!expanded) setExtra(0);
  }

  const save = async (reps: number, weightKg: number) => {
    const set = await setRepository.add(
      { sessionId: session.id, machineId: machine.id, setNumber: nextNumber, reps, weightKg },
      restLengthFor(machine, profile),
    );
    if (sets.length >= targetSets) setExtra((n) => Math.max(0, n - 1));
    showUndo(strings.session.saved, () => setRepository.softDelete(set.id));
  };

  const remove = async (set: SetRecord) => {
    try {
      await setRepository.softDelete(set.id);
      showUndo(strings.session.deleted, () => setRepository.restore(set.id));
    } catch (error) {
      void logError('set.delete', error);
    }
  };

  return (
    <li className={`card flex flex-col gap-3 ${expanded ? 'ring-2 ring-accent/60' : ''}`}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex flex-1 items-center gap-3 text-left disabled:cursor-default"
          onClick={onExpand}
          disabled={!started}
          aria-expanded={started ? expanded : undefined}
        >
          <MachineImage machine={machine} className="size-14" />
          <span className="flex-1">
            <span className="block font-semibold">{machine.name}</span>
            <span className="block font-display text-lg tabular-nums text-muted">
              {strings.session.setsDone(sets.length, targetSets)}{' '}
              {target && <SchemeBadge item={target} />}
            </span>
          </span>
        </button>
        <div className="flex gap-1">
          <button type="button" className="btn-icon" aria-label={strings.common.moveUp} disabled={first} onClick={() => onMove(-1)}>
            ↑
          </button>
          <button type="button" className="btn-icon" aria-label={strings.common.moveDown} disabled={last} onClick={() => onMove(1)}>
            ↓
          </button>
          {sets.length === 0 && (
            <button type="button" className="btn-secondary" onClick={onSkip}>
              {strings.session.skip}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <ol className="flex flex-col gap-2">
          {sets.map((set) => (
            <SetRow
              key={set.id}
              setNumber={set.setNumber}
              saved={set}
              initial={null}
              weightUnit={profile.weightUnit}
              stepKg={stepKg}
              canSave
              onSave={async (reps, weightKg) => {
                await setRepository.update(set.id, { reps, weightKg });
              }}
              onDelete={() => void remove(set)}
            />
          ))}
          {drafts > 0 && (
            <SetRow
              key={`draft-${nextNumber}`}
              setNumber={nextNumber}
              initial={prefill({ setNumber: nextNumber, thisSession: sets, lastSession: entry.lastSession, target })}
              hint={hintFor(nextNumber)}
              weightUnit={profile.weightUnit}
              stepKg={stepKg}
              canSave
              onSave={save}
            />
          )}
          {Array.from({ length: Math.max(drafts - 1, 0) }, (_, i) => (
            <li key={`later-${i}`} className="rounded-xl p-3 font-display text-lg text-muted ring-1 ring-line/5">
              {strings.session.set} {nextNumber + i + 1}
              {hintFor(nextNumber + i + 1) && <span className="ml-3 font-sans text-sm">{hintFor(nextNumber + i + 1)}</span>}
            </li>
          ))}
          <li>
            <button type="button" className="btn-secondary w-full" onClick={() => setExtra((n) => n + 1)}>
              {strings.session.addSet}
            </button>
          </li>
        </ol>
      )}
    </li>
  );
}

function Summary({ session, sets }: { session: Session; sets: SetRecord[] }) {
  const unsaved = useLiveQuery(() => metaRepository.changesSinceExport(), []);
  const machines = new Set(sets.map((s) => s.machineId)).size;
  const duration =
    session.startedAt && session.finishedAt
      ? (Date.parse(session.finishedAt) - Date.parse(session.startedAt)) / 1000
      : 0;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="heading text-accent">{strings.session.summaryTitle}</h1>
      <dl className="grid grid-cols-3 gap-3">
        {(
          [
            [strings.session.summarySets, String(sets.length)],
            [strings.session.summaryMachines, String(machines)],
            [strings.session.summaryDuration, formatDuration(duration)],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="card">
            <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
            <dd className="font-display text-3xl tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {unsaved && unsaved.sets > 0 && (
        <div className="card flex flex-col gap-3">
          <p>{strings.backup.notBackedUp(unsaved.sets)}</p>
          <BackupButton />
        </div>
      )}
      <Link to="/" className="btn-secondary">
        {strings.common.done}
      </Link>
    </div>
  );
}

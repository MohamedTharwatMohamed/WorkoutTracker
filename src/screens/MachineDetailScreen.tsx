import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useParams } from 'react-router';
import { BodyMap } from '../components/BodyMap';
import { MachineImage } from '../components/MachineImage';
import { useProfile } from '../components/profileContext';
import * as machineRepository from '../data/machineRepository';
import * as photoRepository from '../data/photoRepository';
import * as routineRepository from '../data/routineRepository';
import * as setRepository from '../data/setRepository';
import type { SetRecord } from '../data/types';
import { machineMuscles } from '../domain/muscles';
import { restLengthFor } from '../domain/restTimer';
import { stepKgFor } from '../domain/units';
import { formatDate, formatWeight } from '../format';
import { logError } from '../platform/errorLog';
import { toWebp } from '../platform/image';
import { pickFile } from '../platform/share';
import { strings } from '../strings';
import { DEFAULT_TARGET_SETS } from './SessionScreen';

export const DEFAULT_TARGET_REPS = 10;

function bySession(sets: SetRecord[]): { sessionId: string; date: string; sets: SetRecord[] }[] {
  const groups = new Map<string, SetRecord[]>();
  for (const set of sets) groups.set(set.sessionId, [...(groups.get(set.sessionId) ?? []), set]);
  return [...groups].map(([sessionId, rows]) => ({
    sessionId,
    date: rows[0]!.loggedAt,
    sets: rows.sort((a, b) => a.setNumber - b.setNumber),
  }));
}

export function MachineDetailScreen() {
  const id = useParams().id ?? '';
  const profile = useProfile();
  const data = useLiveQuery(async () => {
    const [machine, history, routine] = await Promise.all([
      machineRepository.get(id),
      setRepository.listByMachine(id),
      routineRepository.peek(),
    ]);
    return { machine, history, inRoutine: routine?.items.some((i) => i.machineId === id) ?? false };
  }, [id]);
  const [photoError, setPhotoError] = useState(false);

  if (!data) return null;
  const { machine, history, inRoutine } = data;

  const changePhoto = async () => {
    setPhotoError(false);
    const file = await pickFile('image/*');
    if (!file) return;
    try {
      const { blob, mime } = await toWebp(file);
      const photoId = await photoRepository.put(blob, mime);
      const old = machine.photoId;
      await machineRepository.setPhoto(machine.id, photoId);
      if (old) await photoRepository.remove(old);
    } catch (error) {
      setPhotoError(true);
      void logError('photo.add', error);
    }
  };
  const removePhoto = async () => {
    const old = machine.photoId;
    if (!old) return;
    await machineRepository.setPhoto(machine.id, null);
    await photoRepository.remove(old);
  };

  const step = stepKgFor({ ownStepKg: machine.ownStepKg, catalogStepKg: machine.weightStepKg }, profile.weightUnit);
  const rest = restLengthFor(machine, profile);
  const ownRest = machine.settingsRestSec ?? machine.customRestSec;
  const muscles = machineMuscles(machine);

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start">
      <section className="card flex flex-col gap-4">
        <Link to="/machines" className="text-sm text-muted">
          ← {strings.machines.title}
        </Link>
        <div className="relative -mx-4 overflow-hidden">
          <MachineImage machine={machine} className="aspect-[4/3] max-h-80 w-full rounded-none!" />
          <span className="absolute bottom-3 left-0 -skew-x-12 bg-accent px-4 py-1 font-display text-lg font-semibold uppercase text-ink">
            {strings.muscleGroups[machine.muscleGroup]}
          </span>
        </div>
        <div>
          <h1 className="heading text-3xl">{machine.name}</h1>
          <div className="slash mt-2" />
          <p className="mt-2 text-muted">{[machine.brand, machine.line].filter(Boolean).join(' · ')}</p>
        </div>

        {machine.note && <p className="rounded-xl bg-bg p-3 text-sm">{machine.note}</p>}

        {!machine.unknown && (
          <>
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-bg p-3">
                <dt className="text-xs uppercase tracking-wide text-muted">{strings.machineDetail.step}</dt>
                <dd className="font-display text-2xl">{formatWeight(step, profile.weightUnit)}</dd>
              </div>
              <div className="rounded-xl bg-bg p-3">
                <dt className="text-xs uppercase tracking-wide text-muted">{strings.machineDetail.rest}</dt>
                <dd className="font-display text-2xl">
                  {rest} {strings.common.seconds}
                  {ownRest === undefined && (
                    <span className="ml-1 text-sm text-muted">({strings.machineDetail.default})</span>
                  )}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Link to={`/machines/${encodeURIComponent(machine.id)}/edit`} className="btn-secondary">
                {strings.machineDetail.editSettings}
              </Link>
              <button type="button" className="btn-secondary" onClick={() => void changePhoto()}>
                {machine.photoId ? strings.machineDetail.replacePhoto : strings.machineDetail.addPhoto}
              </button>
              {machine.photoId && (
                <button type="button" className="btn-danger" onClick={() => void removePhoto()}>
                  {strings.machineDetail.removePhoto}
                </button>
              )}
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void machineRepository.updateSettings(machine.id, { hidden: !machine.hidden })}
              >
                {machine.hidden ? strings.machineDetail.unhide : strings.machineDetail.hide}
              </button>
              {inRoutine ? (
                <span className="chip text-success">{strings.machineDetail.inRoutine}</span>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() =>
                    void routineRepository.addItem({
                      machineId: machine.id,
                      targetSets: DEFAULT_TARGET_SETS,
                      targetReps: DEFAULT_TARGET_REPS,
                    })
                  }
                >
                  {strings.machineDetail.addToRoutine}
                </button>
              )}
            </div>
            {photoError && (
              <p role="alert" className="text-sm text-danger">
                {strings.machineDetail.photoFailed}
              </p>
            )}
          </>
        )}
      </section>

      <div className="flex flex-col gap-4">
      <section className="card relative isolate flex flex-col gap-3 overflow-hidden">
        <h2 className="subheading">{strings.bodyMap.title}</h2>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <BodyMap
            className="w-full max-w-64"
            regions={new Map([...muscles.secondary.map((r) => [r, 0.35] as const), ...muscles.primary.map((r) => [r, 1] as const)])}
            pulse={muscles.primary}
          />
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">{strings.bodyMap.primary}</dt>
              {muscles.primary.map((r) => (
                <dd key={r} className="flex items-center gap-2 font-semibold">
                  <span className="size-2.5 rounded-full bg-muscle" />
                  {strings.regions[r]}
                </dd>
              ))}
            </div>
            {muscles.secondary.length > 0 && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">{strings.bodyMap.secondary}</dt>
                {muscles.secondary.map((r) => (
                  <dd key={r} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-muscle/45" />
                    {strings.regions[r]}
                  </dd>
                ))}
              </div>
            )}
          </dl>
        </div>
      </section>
      <section className="card flex flex-col gap-3">
        <h2 className="subheading">{strings.machineDetail.history}</h2>
        {history.length === 0 && <p className="text-muted">{strings.machineDetail.noHistory}</p>}
        {bySession(history).map((group) => (
          <div key={group.sessionId} className="rounded-xl bg-bg p-3">
            <div className="text-sm text-muted">{formatDate(group.date)}</div>
            <div className="mt-1 flex flex-wrap gap-2 font-display text-lg tabular-nums">
              {group.sets.map((s) => (
                <span key={s.id} className="rounded-lg bg-surface px-2">
                  {s.reps} × {formatWeight(s.weightKg, profile.weightUnit)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>
      </div>
    </div>
  );
}

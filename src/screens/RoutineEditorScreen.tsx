import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { MachineImage } from '../components/MachineImage';
import { MachinePicker } from '../components/MachinePicker';
import { CountStepper, WeightStepper } from '../components/Stepper';
import { useProfile } from '../components/profileContext';
import * as machineRepository from '../data/machineRepository';
import * as routineRepository from '../data/routineRepository';
import type { RoutineItem } from '../data/types';
import { stepKgFor } from '../domain/units';
import { logError } from '../platform/errorLog';
import { strings } from '../strings';
import { DEFAULT_TARGET_REPS } from './MachineDetailScreen';
import { DEFAULT_TARGET_SETS } from './SessionScreen';

async function updateItem(machineId: string, patch: Partial<RoutineItem>): Promise<void> {
  const routine = await routineRepository.get();
  const items = routine.items.map((item) => {
    if (item.machineId !== machineId) return item;
    const updated = { ...item, ...patch };
    if ('targetWeightKg' in patch && patch.targetWeightKg === undefined) delete updated.targetWeightKg;
    return updated;
  });
  await routineRepository.save({ ...routine, items });
}

const run = (kind: string, action: () => Promise<unknown>) => {
  action().catch((error: unknown) => void logError(kind, error));
};

export function RoutineEditorScreen() {
  const profile = useProfile();
  const [picking, setPicking] = useState(false);
  const data = useLiveQuery(async () => {
    const items = (await routineRepository.peek())?.items ?? [];
    const machines = await machineRepository.getMany(items.map((i) => i.machineId));
    return items.map((item, i) => ({ item, machine: machines[i]! }));
  }, []);
  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="heading">{strings.routine.title}</h1>
      {data.length === 0 && <p className="text-muted">{strings.routine.empty}</p>}
      <ol className="grid gap-3 lg:grid-cols-2">
        {data.map(({ item, machine }, index) => {
          const stepKg = stepKgFor({ ownStepKg: machine.ownStepKg, catalogStepKg: machine.weightStepKg }, profile.weightUnit);
          return (
            <li key={item.machineId} className="card flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="font-display text-2xl text-accent">{index + 1}</span>
                <MachineImage machine={machine} className="size-14" />
                <span className="flex-1 font-semibold">{machine.name}</span>
                <button type="button" className="btn-icon" aria-label={strings.common.moveUp} disabled={index === 0} onClick={() => run('routine.move', () => routineRepository.moveItem(item.machineId, 'up'))}>
                  ↑
                </button>
                <button type="button" className="btn-icon" aria-label={strings.common.moveDown} disabled={index === data.length - 1} onClick={() => run('routine.move', () => routineRepository.moveItem(item.machineId, 'down'))}>
                  ↓
                </button>
                <button type="button" className="btn-danger" aria-label={strings.common.remove} onClick={() => run('routine.remove', () => routineRepository.removeItem(item.machineId))}>
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <CountStepper label={strings.routine.targetSets} value={item.targetSets} min={1} onChange={(targetSets) => run('routine.update', () => updateItem(item.machineId, { targetSets }))} />
                <CountStepper label={strings.routine.targetReps} value={item.targetReps} min={1} onChange={(targetReps) => run('routine.update', () => updateItem(item.machineId, { targetReps }))} />
              </div>
              <WeightStepper
                label={strings.routine.targetWeight}
                valueKg={item.targetWeightKg ?? null}
                unit={profile.weightUnit}
                stepKg={stepKg}
                onChange={(targetWeightKg) => run('routine.update', () => updateItem(item.machineId, { targetWeightKg }))}
              />
              {item.targetWeightKg !== undefined && (
                <button type="button" className="btn-secondary self-start" onClick={() => run('routine.update', () => updateItem(item.machineId, { targetWeightKg: undefined }))}>
                  {strings.routine.clearWeight}
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <button type="button" className="btn-primary" onClick={() => setPicking(true)}>
        + {strings.session.addMachine}
      </button>
      <MachinePicker
        open={picking}
        exclude={data.map((d) => d.item.machineId)}
        onClose={() => setPicking(false)}
        onPick={(machineId) => {
          setPicking(false);
          run('routine.add', () =>
            routineRepository.addItem({ machineId, targetSets: DEFAULT_TARGET_SETS, targetReps: DEFAULT_TARGET_REPS }),
          );
        }}
      />
    </div>
  );
}

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import * as machineRepository from '../data/machineRepository';
import { MUSCLE_GROUPS, type MuscleGroup } from '../data/types';
import { strings } from '../strings';
import { MachineImage } from './MachineImage';

export function MuscleChips({
  value,
  onChange,
}: {
  value: MuscleGroup | undefined;
  onChange: (group: MuscleGroup | undefined) => void;
}) {
  const chip = (active: boolean) =>
    `chip shrink-0 ${active ? 'bg-accent text-bg ring-accent' : 'text-text'}`;
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      <button type="button" className={chip(value === undefined)} onClick={() => onChange(undefined)}>
        {strings.machines.all}
      </button>
      {MUSCLE_GROUPS.map((group) => (
        <button
          key={group}
          type="button"
          className={chip(value === group)}
          aria-pressed={value === group}
          onClick={() => onChange(group)}
        >
          {strings.muscleGroups[group]}
        </button>
      ))}
    </div>
  );
}

/** Full-screen sheet to pick one machine, leaving out `exclude`. */
export function MachinePicker({
  open,
  exclude,
  onPick,
  onClose,
}: {
  open: boolean;
  exclude: readonly string[];
  onPick: (machineId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<MuscleGroup | undefined>();
  const machines = useLiveQuery(
    () => (open ? machineRepository.list({ query, muscleGroup: group }) : Promise.resolve([])),
    [open, query, group],
  );
  if (!open) return null;
  const shown = (machines ?? []).filter((m) => !exclude.includes(m.id));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg" role="dialog" aria-modal="true" aria-label={strings.machines.pickTitle}>
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <h2 className="heading text-2xl">{strings.machines.pickTitle}</h2>
          <button type="button" className="btn-secondary" onClick={onClose}>
            {strings.common.close}
          </button>
        </div>
        <input
          type="search"
          className="field"
          placeholder={strings.machines.search}
          aria-label={strings.machines.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <MuscleChips value={group} onChange={setGroup} />
      </div>
      <ul className="flex-1 overflow-y-auto p-4">
        {shown.length === 0 && machines && <li className="text-muted">{strings.machines.empty}</li>}
        {shown.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-surface"
              onClick={() => onPick(m.id)}
            >
              <MachineImage machine={m} className="size-14" />
              <span className="flex-1">
                <span className="block font-semibold">{m.name}</span>
                <span className="block text-sm text-muted">
                  {[m.brand, strings.muscleGroups[m.muscleGroup]].filter(Boolean).join(' · ')}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { MachineImage } from '../components/MachineImage';
import { MuscleChips } from '../components/MachinePicker';
import * as machineRepository from '../data/machineRepository';
import type { MuscleGroup } from '../data/types';
import { strings } from '../strings';

export function MachinesScreen() {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<MuscleGroup | undefined>();
  const [includeHidden, setIncludeHidden] = useState(false);
  const machines = useLiveQuery(
    () => machineRepository.list({ query, muscleGroup: group, includeHidden }),
    [query, group, includeHidden],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="heading">{strings.machines.title}</h1>
        <Link to="/machines/new" className="btn-secondary">
          + {strings.machines.newCustom}
        </Link>
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
      <label className="flex min-h-12 items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          className="size-5 accent-[var(--color-accent)]"
          checked={includeHidden}
          onChange={(e) => setIncludeHidden(e.target.checked)}
        />
        {strings.machines.showHidden}
      </label>
      {machines && machines.length === 0 && <p className="text-muted">{strings.machines.empty}</p>}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {machines?.map((m) => (
          <li key={m.id}>
            <Link
              to={`/machines/${encodeURIComponent(m.id)}`}
              className={`card flex items-center gap-3 hover:ring-accent/40 ${m.hidden ? 'opacity-60' : ''}`}
            >
              <MachineImage machine={m} className="size-16" />
              <span className="flex-1">
                <span className="block font-semibold">{m.name}</span>
                <span className="block text-sm text-muted">
                  {[m.brand, strings.muscleGroups[m.muscleGroup], m.custom && strings.machines.custom, m.hidden && strings.machines.hidden]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

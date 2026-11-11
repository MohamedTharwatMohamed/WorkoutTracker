import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { MachineImage } from '../components/MachineImage';
import { MuscleChips } from '../components/MachinePicker';
import { PageHeader } from '../components/PageHeader';
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
      <PageHeader
        title={strings.machines.title}
        tagline={strings.machines.tagline}
        word="Iron"
        actions={
          <Link to="/machines/new" className="btn-secondary">
            + <span className="hidden sm:inline">{strings.machines.newCustom}</span>
          </Link>
        }
      />
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
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {machines?.map((m) => (
          <li key={m.id}>
            <Link
              to={`/machines/${encodeURIComponent(m.id)}`}
              className={`group flex h-full flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-line/5 transition hover:-translate-y-0.5 hover:ring-accent/50 ${m.hidden ? 'opacity-60' : ''}`}
            >
              <div className="relative">
                <MachineImage machine={m} className="aspect-[4/3] w-full rounded-none!" />
                <span className="absolute bottom-2 left-0 -skew-x-12 bg-accent px-2 py-0.5 font-display text-xs font-semibold uppercase text-ink">
                  {strings.muscleGroups[m.muscleGroup]}
                </span>
              </div>
              <span className="flex flex-1 flex-col gap-0.5 p-3">
                <span className="block leading-tight font-semibold group-hover:text-accent">{m.name}</span>
                <span className="block text-xs text-muted">
                  {[m.brand, m.custom && strings.machines.custom, m.hidden && strings.machines.hidden]
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

import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { strings } from '../strings';

/** Sporty page title: outlined background word, sharp accent slash and a tagline. */
export function PageHeader({
  title,
  tagline,
  word,
  actions,
}: {
  title: string;
  tagline?: string;
  /** Large outlined word behind the title; defaults to the title. */
  word?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="relative isolate mb-6 overflow-hidden pt-2 pb-4">
      <span aria-hidden className="text-outline pointer-events-none absolute -top-3 right-0 -z-10 select-none font-display text-[5.5rem] leading-none font-bold uppercase lg:text-[8rem]">
        {word ?? title}
      </span>
      <div aria-hidden className="absolute top-0 right-24 -z-10 h-full w-24 -skew-x-[24deg] stripes opacity-40" />
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="heading text-4xl lg:text-5xl">{title}</h1>
          <div aria-hidden className="slash mt-2" />
          {tagline && <p className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-muted">{tagline}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          <Link to="/settings" className="btn-icon lg:hidden" aria-label={strings.nav.settings}>
            ⚙
          </Link>
        </div>
      </div>
    </header>
  );
}

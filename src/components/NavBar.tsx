import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router';
import { motivationOfDay } from '../motivation';
import { strings } from '../strings';

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {path}
  </svg>
);

const icons = {
  home: icon(<path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z" />),
  plans: icon(
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>,
  ),
  machines: icon(<path d="M2 10v4M5 7v10M8 9v6M8 12h8M16 9v6M19 7v10M22 10v4" />),
  progress: icon(<path d="M3 20h18M6 16l4-5 3 3 5-7M15 7h3v3" />),
  body: icon(
    <>
      <circle cx="12" cy="4.5" r="2" />
      <path d="M5 9h14M12 9v6M12 15l-3 6M12 15l3 6" />
    </>,
  ),
  settings: icon(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </>,
  ),
};

const items: { to: string; label: string; icon: ReactNode; also?: string }[] = [
  { to: '/', label: strings.nav.home, icon: icons.home },
  { to: '/plans', label: strings.nav.plans, icon: icons.plans, also: '/routine' },
  { to: '/machines', label: strings.nav.machines, icon: icons.machines },
  { to: '/progress', label: strings.nav.progress, icon: icons.progress },
  { to: '/body', label: strings.nav.body, icon: icons.body },
];

const linkClass = (active: boolean) =>
  `relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-semibold uppercase tracking-wide lg:flex-row lg:justify-start lg:gap-3 lg:rounded-xl lg:px-3 lg:text-sm ${
    active
      ? 'text-accent lg:bg-accent/10 before:absolute before:top-0 before:h-0.5 before:w-8 before:bg-accent lg:before:top-2 lg:before:bottom-2 lg:before:left-0 lg:before:h-auto lg:before:w-1'
      : 'text-muted hover:text-text'
  }`;

/** Bottom bar on phones, side bar from 1024 px. Settings is in the page header on phones. */
export function NavBar() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Main"
      className="dark-scope fixed inset-x-0 bottom-0 z-30 border-t border-line/10 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:inset-y-0 lg:right-auto lg:flex lg:w-56 lg:flex-col lg:border-t-0 lg:border-r lg:pb-0"
    >
      <div className="hidden px-5 pt-6 pb-8 lg:block">
        <div className="font-display text-2xl leading-none font-bold uppercase tracking-wide text-accent">{strings.appName}</div>
        <div className="slash mt-2 w-12" />
      </div>
      <ul className="grid grid-cols-5 lg:flex lg:flex-col lg:gap-1 lg:px-3">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => linkClass(isActive || (!!item.also && pathname.startsWith(item.also)))}
            >
              {item.icon}
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="mt-auto hidden flex-col gap-4 px-3 pb-6 lg:flex">
        <p aria-hidden className="text-outline-strong px-2 font-display text-3xl leading-tight font-bold uppercase">
          {motivationOfDay()}
        </p>
        <NavLink to="/settings" className={({ isActive }) => linkClass(isActive)}>
          {icons.settings}
          {strings.nav.settings}
        </NavLink>
      </div>
    </nav>
  );
}

import { NavLink } from 'react-router';
import { strings } from '../strings';

const items = [
  { to: '/', label: strings.nav.today, icon: '◉' },
  { to: '/machines', label: strings.nav.machines, icon: '▤' },
  { to: '/routine', label: strings.nav.routine, icon: '☰' },
  { to: '/body', label: strings.nav.body, icon: '◎' },
  { to: '/settings', label: strings.nav.settings, icon: '⚙' },
] as const;

/** Bottom bar on phones, side bar from 1024 px. */
export function NavBar() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:inset-y-0 lg:right-auto lg:w-56 lg:border-t-0 lg:border-r lg:pb-0"
    >
      <div className="hidden px-5 py-6 font-display text-2xl uppercase tracking-wide text-accent lg:block">
        {strings.appName}
      </div>
      <ul className="grid grid-cols-5 lg:flex lg:flex-col lg:gap-1 lg:px-3">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold uppercase tracking-wide lg:flex-row lg:justify-start lg:gap-3 lg:rounded-xl lg:px-3 lg:text-sm ${
                  isActive ? 'text-accent lg:bg-accent/10' : 'text-muted hover:text-text'
                }`
              }
            >
              <span aria-hidden className="text-lg">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

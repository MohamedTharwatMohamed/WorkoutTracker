import type { ReactNode } from 'react';

const tones = {
  info: 'bg-accent/10 ring-accent/40',
  warning: 'bg-amber-400/10 ring-amber-400/40',
  danger: 'bg-danger/10 ring-danger/40',
} as const;

export function Banner({
  tone = 'info',
  children,
  actions,
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div role="status" className={`rounded-2xl p-3 text-sm ring-1 ${tones[tone]}`}>
      <p>{children}</p>
      {actions && <div className="mt-2 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

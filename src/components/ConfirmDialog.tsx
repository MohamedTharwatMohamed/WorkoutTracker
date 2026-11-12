import type { ReactNode } from 'react';
import { strings } from '../strings';

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="card flex max-h-full w-full max-w-md flex-col"
      >
        <h2 className="shrink-0 font-display text-2xl uppercase">{title}</h2>
        {children && (
          <div className="mt-2 min-h-0 space-y-2 overflow-y-auto text-sm text-muted">{children}</div>
        )}
        <div className="mt-4 flex shrink-0 justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            {strings.common.cancel}
          </button>
          <button
            type="button"
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

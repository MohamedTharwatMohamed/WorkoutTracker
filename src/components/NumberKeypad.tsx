import { useState } from 'react';
import { strings } from '../strings';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'] as const;

/** Full-width keypad sheet. Calls onClose with the number, or undefined on Cancel or empty input. */
export function NumberKeypad({
  label,
  placeholder,
  allowDecimal,
  onClose,
}: {
  label: string;
  placeholder?: string;
  allowDecimal: boolean;
  onClose: (value: number | undefined) => void;
}) {
  const [text, setText] = useState('');

  const press = (key: (typeof KEYS)[number]) => {
    if (key === '⌫') return setText((t) => t.slice(0, -1));
    if (key === '.' && (!allowDecimal || text.includes('.'))) return;
    if (text.replace('.', '').length >= 6) return;
    setText((t) => (key === '.' && t === '' ? '0.' : t + key));
  };

  const ok = () => {
    const value = Number(text);
    onClose(text === '' || !Number.isFinite(value) ? undefined : value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={() => onClose(undefined)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="w-full rounded-t-3xl bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:mx-auto lg:mb-8 lg:max-w-md lg:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-muted">{label}</p>
        <output
          aria-live="polite"
          className="mb-3 block h-14 text-right font-display text-5xl tabular-nums"
        >
          {text || <span className="text-muted/50">{placeholder}</span>}
        </output>
        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className="btn-secondary h-14 text-2xl"
              disabled={key === '.' && !allowDecimal}
              aria-label={key === '⌫' ? 'Backspace' : key}
              onClick={() => press(key)}
            >
              {key}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="btn-secondary" onClick={() => onClose(undefined)}>
            {strings.common.cancel}
          </button>
          <button type="button" className="btn-primary" onClick={ok}>
            {strings.common.ok}
          </button>
        </div>
      </div>
    </div>
  );
}

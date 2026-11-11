import { useState } from 'react';
import { formatNumber, kgToDisplay } from '../format';
import { lbToKg, stepWeight } from '../domain/units';
import { NumberKeypad } from './NumberKeypad';

/**
 * − / value / + control. The caller owns the value and the step rule; tapping the
 * value opens the keypad, which returns a number in display units.
 */
export function Stepper({
  label,
  display,
  unit,
  onDecrement,
  onIncrement,
  onEnter,
  allowDecimal = false,
  disabled = false,
}: {
  label: string;
  display: string;
  unit?: string;
  onDecrement: () => void;
  onIncrement: () => void;
  onEnter: (value: number) => void;
  allowDecimal?: boolean;
  disabled?: boolean;
}) {
  const [keypad, setKeypad] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted">
        {label}
        {unit && ` (${unit})`}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="btn-icon"
          aria-label={`${label} −`}
          onClick={onDecrement}
          disabled={disabled}
        >
          −
        </button>
        <button
          type="button"
          className="btn min-w-16 flex-1 bg-bg font-display text-2xl tabular-nums ring-1 ring-line/10"
          aria-label={`${label}: ${display}`}
          onClick={() => setKeypad(true)}
          disabled={disabled}
        >
          {display}
        </button>
        <button
          type="button"
          className="btn-icon"
          aria-label={`${label} +`}
          onClick={onIncrement}
          disabled={disabled}
        >
          +
        </button>
      </div>
      {keypad && (
        <NumberKeypad
          label={unit ? `${label} (${unit})` : label}
          placeholder={display}
          allowDecimal={allowDecimal}
          onClose={(value) => {
            setKeypad(false);
            if (value !== undefined) onEnter(value);
          }}
        />
      )}
    </div>
  );
}

/** A Stepper over a weight stored in kg and shown in the profile's unit. */
export function WeightStepper({
  label,
  valueKg,
  unit,
  stepKg,
  onChange,
  disabled,
}: {
  label: string;
  valueKg: number | null;
  unit: 'kg' | 'lb';
  stepKg: number;
  onChange: (kg: number) => void;
  disabled?: boolean;
}) {
  return (
    <Stepper
      label={label}
      unit={unit}
      display={valueKg === null ? '—' : formatNumber(kgToDisplay(valueKg, unit), 2)}
      allowDecimal
      disabled={disabled}
      onDecrement={() => onChange(stepWeight(valueKg ?? 0, stepKg, -1))}
      onIncrement={() => onChange(stepWeight(valueKg ?? 0, stepKg, 1))}
      onEnter={(value) => onChange(unit === 'lb' ? lbToKg(value) : value)}
    />
  );
}

/** A Stepper over a whole number, never below `min`. */
export function CountStepper({
  label,
  value,
  min = 0,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <Stepper
      label={label}
      display={String(value)}
      disabled={disabled}
      onDecrement={() => onChange(Math.max(min, value - 1))}
      onIncrement={() => onChange(value + 1)}
      onEnter={(entered) => onChange(Math.max(min, Math.round(entered)))}
    />
  );
}

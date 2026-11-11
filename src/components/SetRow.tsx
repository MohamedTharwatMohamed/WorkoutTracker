import { useState } from 'react';
import type { SetRecord } from '../data/types';
import { formatWeight } from '../format';
import { logError } from '../platform/errorLog';
import { strings } from '../strings';
import { Stepper, WeightStepper } from './Stepper';

interface Values {
  reps: number | null;
  weightKg: number | null;
}

/**
 * One set. A row is shown as saved only when `saved` (read from storage) is given;
 * a draft stays editable until the parent's live query returns the stored set.
 */
export function SetRow({
  setNumber,
  saved,
  initial,
  weightUnit,
  stepKg,
  canSave,
  onSave,
  onDelete,
}: {
  setNumber: number;
  saved?: SetRecord;
  initial: { reps: number; weightKg: number } | null;
  weightUnit: 'kg' | 'lb';
  stepKg: number;
  canSave: boolean;
  onSave: (reps: number, weightKg: number) => Promise<void>;
  onDelete?: () => void;
}) {
  const start: Values = saved
    ? { reps: saved.reps, weightKg: saved.weightKg }
    : { reps: initial?.reps ?? null, weightKg: initial?.weightKg ?? null };
  const [values, setValues] = useState<Values>(start);
  const [editing, setEditing] = useState(!saved);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (saved && !editing) {
    return (
      <li className="flex items-center gap-3 rounded-xl bg-success/10 p-2 pl-3 ring-1 ring-success/30">
        <span aria-hidden className="text-success">
          ✓
        </span>
        <span className="font-display text-lg">
          {strings.session.set} {setNumber}
        </span>
        <span className="flex-1 font-display text-xl tabular-nums">
          {saved.reps} × {formatWeight(saved.weightKg, weightUnit)}
        </span>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setValues({ reps: saved.reps, weightKg: saved.weightKg });
            setEditing(true);
          }}
        >
          {strings.common.edit}
        </button>
        {onDelete && (
          <button type="button" className="btn-danger" onClick={onDelete} aria-label={strings.common.delete}>
            ✕
          </button>
        )}
      </li>
    );
  }

  const save = async () => {
    if (values.reps === null || values.weightKg === null) return;
    setBusy(true);
    setFailed(false);
    try {
      await onSave(values.reps, values.weightKg);
      if (saved) setEditing(false);
    } catch (error) {
      setFailed(true);
      void logError('set.save', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-xl bg-bg/60 p-3 ring-1 ring-white/10">
      <div className="mb-2 font-display text-lg">
        {strings.session.set} {setNumber}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Stepper
          label={strings.session.reps}
          display={values.reps === null ? '—' : String(values.reps)}
          onDecrement={() => setValues((v) => ({ ...v, reps: Math.max(0, (v.reps ?? 1) - 1) }))}
          onIncrement={() => setValues((v) => ({ ...v, reps: (v.reps ?? 0) + 1 }))}
          onEnter={(reps) => setValues((v) => ({ ...v, reps: Math.max(0, Math.round(reps)) }))}
        />
        <WeightStepper
          label={strings.session.weight}
          valueKg={values.weightKg}
          unit={weightUnit}
          stepKg={stepKg}
          onChange={(weightKg) => setValues((v) => ({ ...v, weightKg }))}
        />
      </div>
      {failed && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {strings.common.notSaved}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        {saved && (
          <button type="button" className="btn-secondary" onClick={() => setEditing(false)} disabled={busy}>
            {strings.common.cancel}
          </button>
        )}
        <button
          type="button"
          className="btn-primary flex-1"
          onClick={() => void save()}
          disabled={busy || !canSave || values.reps === null || values.weightKg === null}
        >
          {strings.common.save}
        </button>
      </div>
    </li>
  );
}

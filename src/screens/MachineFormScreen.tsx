import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useProfile } from '../components/profileContext';
import * as machineRepository from '../data/machineRepository';
import { MUSCLE_GROUPS, type MuscleGroup } from '../data/types';
import { lbToKg } from '../domain/units';
import { kgToDisplay } from '../format';
import { logError } from '../platform/errorLog';
import { strings } from '../strings';

const parsePositive = (text: string): number | null => {
  const n = Number(text.replace(',', '.'));
  return text.trim() && Number.isFinite(n) && n > 0 ? n : null;
};

/** `/machines/new` creates a custom machine; `/machines/:id/edit` edits step and rest. */
export function MachineFormScreen() {
  const id = useParams().id;
  const navigate = useNavigate();
  const profile = useProfile();
  const unit = profile.weightUnit;
  const [machine, setMachine] = useState<machineRepository.MachineView | null>(null);
  const [name, setName] = useState('');
  const [group, setGroup] = useState<MuscleGroup>('chest');
  const [step, setStep] = useState(unit === 'lb' ? '5' : '2.5');
  const [rest, setRest] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    void machineRepository.get(id).then((m) => {
      setMachine(m);
      setName(m.name);
      setGroup(m.muscleGroup);
      setStep(m.ownStepKg !== undefined ? String(kgToDisplay(m.ownStepKg, unit)) : '');
      const own = m.settingsRestSec ?? m.customRestSec;
      setRest(own !== undefined ? String(own) : '');
    });
  }, [id, unit]);

  const editing = id !== undefined;
  const custom = !editing || machine?.custom === true;

  const submit = async () => {
    setError(null);
    if (custom && !name.trim()) return setError(strings.machineForm.nameRequired);
    const stepValue = parsePositive(step);
    const restValue = parsePositive(rest);
    if ((step.trim() && stepValue === null) || (rest.trim() && restValue === null) || (custom && stepValue === null)) {
      return setError(strings.machineForm.invalidNumber);
    }
    const stepKg = stepValue === null ? undefined : unit === 'lb' ? lbToKg(stepValue) : stepValue;
    const restSec = restValue === null ? undefined : Math.round(restValue);
    setBusy(true);
    try {
      if (!editing) {
        const newId = await machineRepository.addCustom({
          name: name.trim(),
          muscleGroup: group,
          weightStepKg: stepKg!,
          ...(restSec !== undefined ? { restSec } : {}),
          aliases: [],
        });
        navigate(`/machines/${encodeURIComponent(newId)}`, { replace: true });
      } else if (machine?.custom) {
        await machineRepository.updateCustom(machine.id, { name: name.trim(), muscleGroup: group, weightStepKg: stepKg!, restSec });
        navigate(-1);
      } else {
        await machineRepository.updateSettings(id, { weightStepKg: stepKg, restSec });
        navigate(-1);
      }
    } catch (e) {
      setError(strings.common.notSaved);
      void logError('machine.save', e);
    } finally {
      setBusy(false);
    }
  };

  if (editing && !machine) return null;

  return (
    <form
      className="card mx-auto flex max-w-lg flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h1 className="heading text-2xl">
        {editing ? strings.machineForm.editTitle : strings.machineForm.newTitle}
      </h1>
      {machine && !machine.custom && <p className="font-semibold">{machine.name}</p>}
      {custom && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted">{strings.machineForm.name}</span>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted">{strings.machineForm.muscleGroup}</span>
            <select className="field" value={group} onChange={(e) => setGroup(e.target.value as MuscleGroup)}>
              {MUSCLE_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {strings.muscleGroups[g]}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wide text-muted">
          {strings.machineForm.step} ({unit})
        </span>
        <input className="field" inputMode="decimal" value={step} onChange={(e) => setStep(e.target.value)} />
        {!custom && <span className="text-xs text-muted">{strings.machineForm.useDefault}</span>}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wide text-muted">{strings.machineForm.rest}</span>
        <input className="field" inputMode="numeric" value={rest} onChange={(e) => setRest(e.target.value)} />
        <span className="text-xs text-muted">{strings.machineForm.useDefault}</span>
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Link to={editing ? `/machines/${encodeURIComponent(id)}` : '/machines'} className="btn-secondary">
          {strings.common.cancel}
        </Link>
        <button type="submit" className="btn-primary flex-1" disabled={busy}>
          {strings.common.save}
        </button>
      </div>
    </form>
  );
}

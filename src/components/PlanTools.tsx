import { useState } from 'react';
import { Link } from 'react-router';
import * as machineRepository from '../data/machineRepository';
import * as planRepository from '../data/planRepository';
import { PLANS } from '../data/plans';
import { buildPlanTemplate, readPlanFile, templateFileName, type PlanDraft, type TemplateMachine } from '../domain/planTemplate';
import { XLSX_MIME } from '../domain/xlsx';
import { logError } from '../platform/errorLog';
import { pickFile, shareOrDownload } from '../platform/share';
import { strings } from '../strings';
import { ConfirmDialog } from './ConfirmDialog';

const MAX_ERRORS = 12;

async function templateMachines(): Promise<TemplateMachine[]> {
  const machines = await machineRepository.list({ includeHidden: true });
  return machines.map((m) => ({ id: m.id, name: m.name, brand: m.brand, line: m.line, muscleGroup: m.muscleGroup, custom: m.custom }));
}

function examplePlan(): PlanDraft {
  const p = PLANS[0]!;
  return {
    name: strings.planTemplate.exampleName,
    tagline: p.tagline,
    description: p.description,
    goal: p.goal,
    level: p.level,
    daysPerWeek: p.daysPerWeek,
    minutes: p.minutes,
    days: p.days,
  };
}

/** Create, import and template actions for custom plans. */
export function PlanTools() {
  const [preview, setPreview] = useState<{ plans: PlanDraft[]; replaces: Set<string> } | null>(null);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setErrors(null);
    setMessage(null);
  };

  const download = async () => {
    reset();
    try {
      const bytes = buildPlanTemplate(await templateMachines(), examplePlan());
      const result = await shareOrDownload(new File([bytes as BlobPart], templateFileName(), { type: XLSX_MIME }));
      if (result !== 'cancelled') setMessage(strings.plans.templateSaved);
    } catch (error) {
      setMessage(strings.common.notSaved);
      void logError('plans.template', error);
    }
  };

  const pick = async () => {
    reset();
    const file = await pickFile(`.xlsx,${XLSX_MIME}`);
    if (!file) return;
    try {
      const result = await readPlanFile(new Uint8Array(await file.arrayBuffer()), await templateMachines());
      if (result.errors.length > 0) return setErrors(result.errors);
      const existing = new Set((await planRepository.list()).map((p) => p.name.trim().toLowerCase()));
      setPreview({
        plans: result.plans,
        replaces: new Set(result.plans.filter((p) => existing.has(p.name.trim().toLowerCase())).map((p) => p.name)),
      });
    } catch (error) {
      setErrors([strings.planTemplate.errors.notXlsx]);
      void logError('plans.import', error);
    }
  };

  const confirm = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const { added, replaced } = await planRepository.importMany(preview.plans);
      setMessage(strings.plans.imported(added, replaced));
    } catch (error) {
      setMessage(strings.common.notSaved);
      void logError('plans.import', error);
    } finally {
      setPreview(null);
      setBusy(false);
    }
  };

  return (
    <section className="card edge flex flex-col gap-3 pl-5">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{strings.plans.toolsTitle}</div>
        <p className="text-sm text-muted">{strings.plans.toolsText}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to="/plans/new" className="btn-primary">
          + {strings.plans.create}
        </Link>
        <button type="button" className="btn-secondary" onClick={() => void pick()}>
          {strings.plans.import}
        </button>
        <button type="button" className="btn-secondary" onClick={() => void download()}>
          {strings.plans.template}
        </button>
      </div>
      {message && (
        <p role="status" className="text-sm text-success">
          {message}
        </p>
      )}
      {errors && (
        <div role="alert" className="text-sm text-danger">
          <p>{strings.plans.importErrors}</p>
          <ul className="list-disc pl-5">
            {errors.slice(0, MAX_ERRORS).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          {errors.length > MAX_ERRORS && <p>{strings.plans.importMore(errors.length - MAX_ERRORS)}</p>}
        </div>
      )}
      <ConfirmDialog
        open={preview !== null}
        title={strings.plans.importTitle}
        confirmLabel={strings.plans.importConfirm(preview?.plans.length ?? 0)}
        busy={busy}
        onConfirm={() => void confirm()}
        onCancel={() => setPreview(null)}
      >
        {preview && (
          <>
            <p>{strings.plans.importFound(preview.plans.length)}</p>
            <ul className="mt-3 flex flex-col gap-2">
              {preview.plans.map((p) => (
                <li key={p.name}>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-muted">
                    {strings.plans.goals[p.goal]} · {strings.plans.perWeek(p.daysPerWeek)} ·{' '}
                    {strings.plans.exercises(p.days.reduce((n, d) => n + d.items.length, 0))}
                  </div>
                  {preview.replaces.has(p.name) && <div className="text-xs text-amber-500">{strings.plans.importReplaces}</div>}
                </li>
              ))}
            </ul>
          </>
        )}
      </ConfirmDialog>
    </section>
  );
}

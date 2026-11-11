import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ConfirmDialog } from '../components/ConfirmDialog';
import TrendChart from '../components/TrendChart';
import { useProfile } from '../components/profileContext';
import * as measurementRepository from '../data/measurementRepository';
import { SIDED_SITES, SITES, type Measurement, type Side, type Site } from '../data/types';
import { change, series } from '../domain/trends';
import { inToCm, lbToKg } from '../domain/units';
import { cmToDisplay, formatDate, formatNumber, kgToDisplay } from '../format';
import { logError } from '../platform/errorLog';
import { strings } from '../strings';

const PRIMARY: readonly Site[] = ['weight', 'waist'];
const fieldKey = (site: Site, side?: Side) => (side ? `${site}-${side}` : site);
const fields = (sites: readonly Site[]): { site: Site; side?: Side }[] =>
  sites.flatMap((site) =>
    SIDED_SITES.includes(site)
      ? (['left', 'right'] as const).map((side) => ({ site, side }))
      : [{ site }],
  );

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function label(site: Site, side?: Side): string {
  return side ? `${strings.sites[site]} (${strings.body[side]})` : strings.sites[site];
}

export default function BodyScreen() {
  const profile = useProfile();
  const [values, setValues] = useState<Record<string, string>>({});
  const [date, setDate] = useState(today);
  const [more, setMore] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [toDelete, setToDelete] = useState<Measurement | null>(null);

  const unitOf = (site: Site) => (site === 'weight' ? profile.weightUnit : profile.lengthUnit);
  const display = (site: Site, value: number) =>
    site === 'weight' ? kgToDisplay(value, profile.weightUnit) : cmToDisplay(value, profile.lengthUnit);
  const toStored = (site: Site, value: number) =>
    site === 'weight'
      ? profile.weightUnit === 'lb' ? lbToKg(value) : value
      : profile.lengthUnit === 'in' ? inToCm(value) : value;

  const data = useLiveQuery(async () => {
    const all = fields(SITES);
    const rows = await Promise.all(all.map((f) => measurementRepository.series(f.site, f.side)));
    return {
      recent: await measurementRepository.recent(30),
      trends: all.map((f, i) => ({ ...f, points: series(rows[i]!) })),
    };
  }, []);

  const save = async () => {
    setMessage(null);
    const entries = Object.entries(values).filter(([, text]) => text.trim());
    if (entries.length === 0) return setMessage({ text: strings.body.nothingToSave, error: true });
    const parsed = entries.map(([key, text]) => {
      const [site, side] = key.split('-') as [Site, Side | undefined];
      return { site, side, value: Number(text.replace(',', '.')) };
    });
    if (parsed.some((p) => !Number.isFinite(p.value) || p.value <= 0)) {
      return setMessage({ text: strings.body.invalid, error: true });
    }
    const takenAt = date === today() ? new Date().toISOString() : new Date(`${date}T12:00`).toISOString();
    try {
      for (const p of parsed) {
        await measurementRepository.add({
          site: p.site,
          ...(p.side ? { side: p.side } : {}),
          value: toStored(p.site, p.value),
          takenAt,
        });
      }
      setValues({});
      setMessage({ text: strings.body.savedCount(parsed.length), error: false });
    } catch (error) {
      setMessage({ text: strings.common.notSaved, error: true });
      void logError('measurement.save', error);
    }
  };

  const shown = fields(more ? SITES : PRIMARY);

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start">
      <h1 className="heading lg:col-span-2">{strings.body.title}</h1>
      <form
        className="card flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted">{strings.body.date}</span>
          <input type="date" className="field" value={date} max={today()} onChange={(e) => setDate(e.target.value || today())} />
        </label>
        {shown.map(({ site, side }) => {
          const key = fieldKey(site, side);
          return (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">
                {label(site, side)} ({unitOf(site)})
              </span>
              <input
                className="field"
                inputMode="decimal"
                value={values[key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              />
              {side !== 'right' && (
                <details className="text-xs text-muted">
                  <summary className="cursor-pointer">{strings.body.hint}</summary>
                  {strings.measureHints[site]}
                </details>
              )}
            </label>
          );
        })}
        <button type="button" className="btn-secondary" onClick={() => setMore((m) => !m)}>
          {more ? strings.body.fewerSites : strings.body.moreSites}
        </button>
        {message && (
          <p role={message.error ? 'alert' : 'status'} className={`text-sm ${message.error ? 'text-danger' : 'text-success'}`}>
            {message.text}
          </p>
        )}
        <button type="submit" className="btn-primary">
          {strings.body.save}
        </button>
      </form>

      <section className="card flex flex-col gap-4">
        <h2 className="subheading">{strings.body.trends}</h2>
        {data && data.trends.every((t) => t.points.length < 2) && <p className="text-muted">{strings.body.noTrends}</p>}
        {data?.trends
          .filter((t) => t.points.length >= 2)
          .map((t) => {
            const points = t.points.map((p) => ({ date: p.date, value: display(t.site, p.value) }));
            const delta = change(points);
            return (
              <div key={fieldKey(t.site, t.side)}>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-semibold">{label(t.site, t.side)}</h3>
                  {delta !== null && (
                    <span className="font-display text-lg tabular-nums text-accent">
                      {delta > 0 ? '+' : ''}
                      {formatNumber(delta)} {unitOf(t.site)}
                    </span>
                  )}
                </div>
                <TrendChart points={points} unit={unitOf(t.site)} />
              </div>
            );
          })}
      </section>

      <section className="card flex flex-col gap-2 lg:col-span-2">
        <h2 className="subheading">{strings.body.history}</h2>
        {data && data.recent.length === 0 && <p className="text-muted">{strings.body.noHistory}</p>}
        <ul className="flex flex-col divide-y divide-white/5">
          {data?.recent.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-1">
              <span className="w-28 text-sm text-muted">{formatDate(m.takenAt)}</span>
              <span className="flex-1">{label(m.site, m.side)}</span>
              <span className="font-display text-lg tabular-nums">
                {formatNumber(display(m.site, m.value))} {unitOf(m.site)}
              </span>
              <button type="button" className="btn-icon" aria-label={strings.common.delete} onClick={() => setToDelete(m)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      </section>

      <ConfirmDialog
        open={toDelete !== null}
        title={strings.body.deleteTitle}
        confirmLabel={strings.common.delete}
        danger
        onConfirm={() => {
          const m = toDelete;
          setToDelete(null);
          if (m) measurementRepository.softDelete(m.id).catch((e: unknown) => void logError('measurement.delete', e));
        }}
        onCancel={() => setToDelete(null)}
      >
        {toDelete && `${label(toDelete.site, toDelete.side)}: ${formatNumber(display(toDelete.site, toDelete.value))} ${unitOf(toDelete.site)}`}
      </ConfirmDialog>
    </div>
  );
}

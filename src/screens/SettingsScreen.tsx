import { PHOTOS } from '../components/Art';
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BackupButton, RestoreButton } from '../components/Backup';
import { PageHeader } from '../components/PageHeader';
import { useProfile } from '../components/profileContext';
import { APP_BUILD, BACKUP_FORMAT_VERSION, BUILD_TIME, SCHEMA_VERSION } from '../buildInfo';
import { loadCatalog, type Catalog } from '../data/catalog';
import * as diagnosticsRepository from '../data/diagnosticsRepository';
import * as metaRepository from '../data/metaRepository';
import * as profileRepository from '../data/profileRepository';
import type { Profile } from '../data/types';
import { checkConsistency } from '../domain/consistency';
import { inToCm } from '../domain/units';
import { cmToDisplay, formatBytes, formatDateTime, formatNumber } from '../format';
import { exportDiagnostics } from '../platform/diagnostics';
import { logError } from '../platform/errorLog';
import { requestPersistence, status } from '../platform/storage';
import { strings } from '../strings';
import { THEME_CHOICES, setTheme, useTheme } from '../theme';
import { Segmented } from './WelcomeScreen';

export const REST_STEP_SEC = 15;

export async function inconsistentSets(): Promise<number> {
  const [journal, sets] = await Promise.all([
    diagnosticsRepository.journal(),
    diagnosticsRepository.allSets({ includeDeleted: true }),
  ]);
  const report = checkConsistency(journal, sets);
  return report.missing.length + report.wronglyDeleted.length + report.wronglyLive.length;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card flex flex-col gap-3">
      <h2 className="subheading">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

export function SettingsScreen() {
  const profile = useProfile();
  const theme = useTheme();
  // null while not editing, so the field follows the saved profile.
  const [heightDraft, setHeight] = useState<string | null>(null);
  const height =
    heightDraft ?? (profile.heightCm === null ? '' : String(cmToDisplay(profile.heightCm, profile.lengthUnit)));
  const [storage, setStorage] = useState<Awaited<ReturnType<typeof status>> | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [consistency, setConsistency] = useState<number | null>(null);
  const backup = useLiveQuery(async () => ({
    last: await metaRepository.get('lastExportAt'),
    state: await metaRepository.get('lastExportState'),
    changes: await metaRepository.changesSinceExport(),
  }), []);

  useEffect(() => {
    status().then(setStorage, () => setStorage(null));
    loadCatalog().then(setCatalog, () => setCatalog(null));
  }, []);

  const update = (patch: Partial<Profile>) => {
    profileRepository.save({ ...profile, ...patch }).catch((e: unknown) => void logError('profile.save', e));
  };
  const saveHeight = () => {
    setHeight(null);
    const n = Number(height.replace(',', '.'));
    if (!height.trim()) return update({ heightCm: null });
    if (Number.isFinite(n) && n > 0) update({ heightCm: profile.lengthUnit === 'in' ? inToCm(n) : n });
  };
  const protect = async () => {
    await requestPersistence();
    setStorage(await status());
  };
  const check = async () => {
    try {
      setConsistency(await inconsistentSets());
    } catch (e) {
      void logError('consistency', e);
    }
  };

  const sources = catalog?.machines.filter((m) => m.image && m.imageSourceUrl) ?? [];

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start">
      <div className="lg:col-span-2">
        <PageHeader title={strings.settings.title} tagline={strings.settings.tagline} word="Setup" />
      </div>

      <Section title={strings.settings.appearance}>
        <Segmented label={strings.settings.theme} value={theme} options={THEME_CHOICES} labels={strings.settings.themes} onChange={setTheme} />
      </Section>

      <Section title={strings.settings.units}>
        <Segmented label={strings.settings.weightUnit} value={profile.weightUnit} options={['kg', 'lb'] as const} onChange={(weightUnit) => update({ weightUnit })} />
        <Segmented label={strings.settings.lengthUnit} value={profile.lengthUnit} options={['cm', 'in'] as const} onChange={(lengthUnit) => update({ lengthUnit })} />
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted">
            {strings.settings.height} ({profile.lengthUnit})
          </span>
          <input className="field" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} onBlur={saveHeight} />
        </label>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted">{strings.settings.defaultRest}</span>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-icon" aria-label={`${strings.settings.defaultRest} −`} disabled={profile.defaultRestSec <= REST_STEP_SEC} onClick={() => update({ defaultRestSec: profile.defaultRestSec - REST_STEP_SEC })}>
              −
            </button>
            <span className="w-16 text-center font-display text-2xl tabular-nums">
              {profile.defaultRestSec} {strings.common.seconds}
            </span>
            <button type="button" className="btn-icon" aria-label={`${strings.settings.defaultRest} +`} onClick={() => update({ defaultRestSec: profile.defaultRestSec + REST_STEP_SEC })}>
              +
            </button>
          </div>
        </div>
      </Section>

      <Section title={strings.settings.backup}>
        <Row label={strings.backup.lastBackup}>
          {typeof backup?.last === 'string'
            ? `${formatDateTime(backup.last)}${backup.state === 'started' ? ` (${strings.backup.started})` : ''}`
            : strings.backup.never}
        </Row>
        <Row label={strings.settings.changes}>{backup?.changes.sets ?? 0}</Row>
        <BackupButton />
        <RestoreButton />
      </Section>

      <Section title={strings.settings.storage}>
        <Row label={strings.settings.protected}>{storage?.persisted ? strings.common.yes : strings.common.no}</Row>
        {storage?.usage !== undefined && <Row label={strings.settings.used}>{formatBytes(storage.usage)}</Row>}
        {storage && !storage.persisted && (
          <button type="button" className="btn-secondary" onClick={() => void protect()}>
            {strings.settings.protect}
          </button>
        )}
      </Section>

      <Section title={strings.settings.diagnostics}>
        <button type="button" className="btn-secondary" onClick={() => exportDiagnostics().catch((e: unknown) => void logError('diagnostics', e))}>
          {strings.settings.exportDiagnostics}
        </button>
        <button type="button" className="btn-secondary" onClick={() => void check()}>
          {strings.settings.checkConsistency}
        </button>
        {consistency !== null && (
          <p role="status" className={consistency === 0 ? 'text-success' : 'text-danger'}>
            {consistency === 0 ? strings.settings.consistent : strings.settings.inconsistent(consistency)}
          </p>
        )}
      </Section>

      <Section title={strings.settings.imageSources}>
        {sources.length === 0 ? (
          <p className="text-muted">{strings.settings.noImages}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {sources.map((m) => (
              <li key={m.id}>
                {m.brand} {m.model}:{' '}
                <a href={m.imageSourceUrl!} className="text-accent underline" target="_blank" rel="noreferrer">
                  {m.imageSourceUrl}
                </a>
              </li>
            ))}
          </ul>
        )}
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {Object.values(PHOTOS).map((p: { src: string; credit: string; url?: string }) => (
            <li key={p.src}>
              {strings.settings.photoBy(p.credit)}
              {p.url && (
                <>
                  :{' '}
                  <a href={p.url} className="text-accent underline" target="_blank" rel="noreferrer">
                    {p.url}
                  </a>
                </>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={strings.settings.about}>
        <Row label={strings.settings.build}>{APP_BUILD}</Row>
        <Row label={strings.settings.buildTime}>{BUILD_TIME}</Row>
        <Row label={strings.settings.schema}>{SCHEMA_VERSION}</Row>
        <Row label={strings.settings.backupFormat}>{BACKUP_FORMAT_VERSION}</Row>
        <Row label={strings.settings.catalog}>{catalog ? formatNumber(catalog.catalogVersion, 0) : '—'}</Row>
      </Section>
    </div>
  );
}

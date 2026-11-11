import { useState } from 'react';
import { useNavigate } from 'react-router';
import { RestoreButton } from '../components/Backup';
import { InstallSteps, shouldWarnTab } from '../components/TabWarningBanner';
import * as metaRepository from '../data/metaRepository';
import * as profileRepository from '../data/profileRepository';
import type { Profile } from '../data/types';
import { newRecord } from '../domain/ids';
import { inToCm } from '../domain/units';
import { logError } from '../platform/errorLog';
import { requestPersistence } from '../platform/storage';
import { strings } from '../strings';

type Step = 'install' | 'usedBefore' | 'onboarding';

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-xs uppercase tracking-wide text-muted">{label}</legend>
      <div className="flex gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            className={`chip flex-1 justify-center ${value === option ? 'bg-accent text-bg ring-accent' : ''}`}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
export function WelcomeScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(() => (shouldWarnTab() ? 'install' : 'usedBefore'));
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [lengthUnit, setLengthUnit] = useState<'cm' | 'in'>('cm');
  const [height, setHeight] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const finish = async () => {
    setBusy(true);
    setError(false);
    try {
      const parsed = Number(height.replace(',', '.'));
      const heightCm =
        height.trim() && parsed > 0 ? (lengthUnit === 'in' ? inToCm(parsed) : parsed) : null;
      const deviceId = await metaRepository.getDeviceId();
      const profile: Profile = {
        ...newRecord(deviceId, new Date().toISOString()),
        id: 'me',
        heightCm,
        weightUnit,
        lengthUnit,
        defaultRestSec: profileRepository.DEFAULT_REST_SEC,
      };
      await profileRepository.save(profile);
      await requestPersistence();
      await metaRepository.rememberCounts();
      navigate('/', { replace: true });
    } catch (e) {
      setError(true);
      void logError('onboarding', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="font-display text-5xl font-bold uppercase tracking-wide text-accent">
        {strings.appName}
      </h1>

      {step === 'install' && (
        <section className="card flex flex-col gap-4">
          <h2 className="heading text-2xl">{strings.install.title}</h2>
          <p className="text-muted">{strings.install.intro}</p>
          <InstallSteps />
          <button type="button" className="btn-secondary" onClick={() => setStep('usedBefore')}>
            {strings.install.continueInBrowser}
          </button>
        </section>
      )}

      {step === 'usedBefore' && (
        <section className="card flex flex-col gap-4">
          <h2 className="heading text-2xl">{strings.welcome.usedBeforeTitle}</h2>
          <p className="text-muted">{strings.welcome.usedBeforeText}</p>
          <RestoreButton
            className="btn-secondary w-full"
            label={strings.welcome.usedBeforeYes}
            onRestored={() => {
              void metaRepository.rememberCounts();
              navigate('/', { replace: true });
            }}
          />
          <button type="button" className="btn-primary" onClick={() => setStep('onboarding')}>
            {strings.welcome.usedBeforeNo}
          </button>
        </section>
      )}

      {step === 'onboarding' && (
        <section className="card flex flex-col gap-4">
          <h2 className="heading text-2xl">{strings.welcome.onboardingTitle}</h2>
          <ul className="flex flex-col gap-2">
            {strings.welcome.points.map((point) => (
              <li key={point} className="flex gap-2">
                <span aria-hidden className="text-accent">
                  ●
                </span>
                {point}
              </li>
            ))}
          </ul>
          <Segmented label={strings.welcome.weightUnit} value={weightUnit} options={['kg', 'lb'] as const} onChange={setWeightUnit} />
          <Segmented label={strings.welcome.lengthUnit} value={lengthUnit} options={['cm', 'in'] as const} onChange={setLengthUnit} />
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted">
              {strings.welcome.height} ({lengthUnit})
            </span>
            <input
              className="field"
              inputMode="decimal"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {strings.common.notSaved}
            </p>
          )}
          <button type="button" className="btn-primary" disabled={busy} onClick={() => void finish()}>
            {strings.welcome.start}
          </button>
        </section>
      )}
    </main>
  );
}

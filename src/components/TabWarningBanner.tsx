import { useEffect, useState } from 'react';
import {
  canPromptInstall,
  isStandalone,
  isTouchDevice,
  onInstallPromptChange,
  platform,
  promptInstall,
} from '../platform/install';
import { strings } from '../strings';
import { BackupButton } from './Backup';
import { Banner } from './Banner';

export function shouldWarnTab(): boolean {
  return isTouchDevice() && !isStandalone();
}

export function useCanPromptInstall(): boolean {
  const [can, setCan] = useState(canPromptInstall);
  useEffect(() => onInstallPromptChange(() => setCan(canPromptInstall())), []);
  return can;
}

/** Install steps for this platform, with the native install button when the browser offers one. */
export function InstallSteps() {
  const can = useCanPromptInstall();
  const steps = platform() === 'ios' ? strings.install.iosSteps : strings.install.androidSteps;
  return (
    <div className="flex flex-col gap-2">
      <ol className="list-decimal pl-5">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {can && (
        <button type="button" className="btn-primary" onClick={() => void promptInstall()}>
          {strings.install.install}
        </button>
      )}
    </div>
  );
}

/** Persistent warning on touch devices using the site in a browser tab. */
export function TabWarningBanner() {
  const [showSteps, setShowSteps] = useState(false);
  return (
    <Banner
      tone="warning"
      actions={
        <>
          <button type="button" className="btn-secondary" onClick={() => setShowSteps((s) => !s)}>
            {strings.install.install}
          </button>
          <BackupButton className="btn-secondary" />
        </>
      }
    >
      {strings.tabWarning}
      {showSteps && (
        <span className="mt-2 block">
          <InstallSteps />
        </span>
      )}
    </Banner>
  );
}

import { useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { onDbAlert, type DbAlert } from '../data/system';
import { strings } from '../strings';
import { BackupBanner } from './BackupBanner';
import { Banner } from './Banner';
import { NavBar } from './NavBar';
import { TabWarningBanner, shouldWarnTab } from './TabWarningBanner';
import { ThemeToggle } from './ThemeToggle';
import { UndoProvider } from './UndoToast';
import { UpdateBanner } from './UpdateBanner';

export function DbAlertBanner() {
  const [alert, setAlert] = useState<DbAlert | null>(null);
  useEffect(() => {
    onDbAlert(setAlert);
    return () => onDbAlert(null);
  }, []);
  if (!alert) return null;
  if (alert === 'blocked') return <Banner tone="warning">{strings.banners.dbBlocked}</Banner>;
  return (
    <Banner
      tone="danger"
      actions={
        <button type="button" className="btn-primary" onClick={() => location.reload()}>
          {strings.common.reload}
        </button>
      }
    >
      {strings.banners.dbVersionChange}
    </Banner>
  );
}

export function Layout({ consistencyWarning = false }: { consistencyWarning?: boolean }) {
  const [warnTab] = useState(shouldWarnTab);
  return (
    <UndoProvider>
      <NavBar />
      <div className="mx-auto max-w-6xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-28 lg:pb-10 lg:pl-60">
        <div className="mb-2 flex justify-end">
          <ThemeToggle />
        </div>
        <div className="mb-4 flex flex-col gap-2 empty:hidden">
          <DbAlertBanner />
          {warnTab && <TabWarningBanner />}
          <UpdateBanner />
          <BackupBanner />
          {consistencyWarning && <Banner tone="danger">{strings.banners.inconsistent}</Banner>}
        </div>
        <main>
          <Outlet />
        </main>
      </div>
    </UndoProvider>
  );
}

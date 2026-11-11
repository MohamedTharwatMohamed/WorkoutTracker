import { useRegisterSW } from 'virtual:pwa-register/react';
import { logError } from './errorLog';

/** `needRefresh` is true when a new build is waiting. The banner hides it while a session is open. */
export function useAppUpdate(): { needRefresh: boolean; update: () => Promise<void> } {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: (error: unknown) => void logError('sw.register', error),
  });
  return { needRefresh, update: () => updateServiceWorker(true) };
}

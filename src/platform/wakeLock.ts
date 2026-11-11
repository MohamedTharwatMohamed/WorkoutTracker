import { useEffect } from 'react';

/** Keeps the screen on while `enabled`. The lock is lost when the page is hidden, so it is requested again. */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let active = true;

    const request = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (active) sentinel = lock;
        else void lock.release();
      } catch {
        // Refused, for example in battery saver mode. The app works without it.
      }
    };
    const onVisibility = () => {
      if (sentinel === null || sentinel.released) void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release();
      sentinel = null;
    };
  }, [enabled]);
}

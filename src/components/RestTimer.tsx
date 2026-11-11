import { useEffect, useRef, useState } from 'react';
import { remainingSec } from '../domain/restTimer';
import { formatDuration } from '../format';
import { strings } from '../strings';

/** Current time in ms, refreshed every second and when the page becomes visible. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return now;
}

export function RestTimer({
  restEndsAt,
  onAdjust,
  onSkip,
  onEnded,
  keepScreenOn,
  onKeepScreenOnChange,
}: {
  restEndsAt: string;
  onAdjust: (deltaSec: number) => void;
  onSkip: () => void;
  onEnded: () => void;
  keepScreenOn: boolean;
  onKeepScreenOnChange: (on: boolean) => void;
}) {
  const now = useNow();
  const left = remainingSec(restEndsAt, new Date(now).toISOString());
  const ended = useRef<string | null>(null);

  useEffect(() => {
    if (left === 0 && ended.current !== restEndsAt) {
      ended.current = restEndsAt;
      onEnded();
    }
  }, [left, restEndsAt, onEnded]);

  return (
    <section
      aria-label={strings.session.rest}
      className="card flex flex-wrap items-center gap-3 bg-accent/10 ring-accent/40"
    >
      <div className="flex-1">
        <div className="text-xs uppercase tracking-wide text-muted">{strings.session.rest}</div>
        <div role="timer" className="font-display text-5xl tabular-nums text-accent">
          {formatDuration(left)}
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary" onClick={() => onAdjust(-15)}>
          −15 {strings.common.seconds}
        </button>
        <button type="button" className="btn-secondary" onClick={() => onAdjust(15)}>
          +15 {strings.common.seconds}
        </button>
        <button type="button" className="btn-primary" onClick={onSkip}>
          {strings.session.skipRest}
        </button>
      </div>
      <label className="flex min-h-12 w-full items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          className="size-5 accent-[var(--color-accent)]"
          checked={keepScreenOn}
          onChange={(e) => onKeepScreenOnChange(e.target.checked)}
        />
        {strings.session.keepScreenOn}
      </label>
    </section>
  );
}

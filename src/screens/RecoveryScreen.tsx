import { useEffect, useState } from 'react';
import * as snapshot from '../data/system';
import { formatDateTime } from '../format';
import { exportDiagnostics } from '../platform/diagnostics';
import { strings } from '../strings';

/** Shown when the database cannot be opened. Nothing here writes to the database. */
export function RecoveryScreen({ error }: { error: unknown }) {
  const [snapshots, setSnapshots] = useState<{ seq: number; createdAt: string }[]>([]);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    snapshot.listSnapshots().then(setSnapshots, () => setSnapshots([]));
  }, []);

  const run = (action: () => Promise<unknown>) => async () => {
    setFailure(null);
    try {
      await action();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="heading text-danger">{strings.recovery.title}</h1>
      <p>{strings.recovery.text}</p>
      <p className="text-sm break-words text-muted">
        {error instanceof Error ? error.message : String(error)}
      </p>
      <button type="button" className="btn-primary" onClick={() => void run(snapshot.exportRaw)()}>
        {strings.recovery.exportRaw}
      </button>
      {snapshots.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="subheading">{strings.recovery.snapshots}</h2>
          {snapshots.map((s) => (
            <button
              key={s.seq}
              type="button"
              className="btn-secondary"
              onClick={() => void run(() => snapshot.exportSnapshot(s.seq))()}
            >
              {strings.recovery.exportSnapshot(formatDateTime(s.createdAt))}
            </button>
          ))}
        </section>
      )}
      <button type="button" className="btn-secondary" onClick={() => void run(exportDiagnostics)()}>
        {strings.recovery.report}
      </button>
      {failure && (
        <p role="alert" className="text-sm text-danger">
          {strings.recovery.failed} {failure}
        </p>
      )}
    </main>
  );
}

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import * as metaRepository from '../data/metaRepository';
import { formatDateTime } from '../format';
import {
  ImportCancelledError,
  confirmImport,
  exportBackup,
  importBackup,
  type ImportPreview,
} from '../platform/backupFlow';
import { logError } from '../platform/errorLog';
import { pickFile } from '../platform/share';
import { strings } from '../strings';
import { ConfirmDialog } from './ConfirmDialog';

/** Runs the export and reports the outcome in a short line under the button. */
export function BackupButton({ className = 'btn-primary' }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await exportBackup();
      setMessage(strings.backup[result]);
    } catch (error) {
      setMessage(strings.common.notSaved);
      void logError('backup.export', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button type="button" className={className} onClick={() => void run()} disabled={busy}>
        {strings.backup.backUp}
      </button>
      {message && (
        <p role="status" className="text-sm text-muted">
          {message}
        </p>
      )}
    </div>
  );
}

/** Pick a file, validate it, show a preview, then replace all data. */
export function RestoreButton({
  className = 'btn-secondary',
  label = strings.backup.restore,
  onRestored,
}: {
  className?: string;
  label?: string;
  onRestored?: () => void;
}) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const unsaved = useLiveQuery(() => metaRepository.changesSinceExport(), []);

  const pick = async () => {
    setErrors(null);
    setMessage(null);
    const file = await pickFile();
    if (!file) return;
    const result = await importBackup(file);
    if (result.ok) setPreview(result.preview);
    else setErrors(result.errors);
  };

  const confirm = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      await confirmImport(preview);
      setPreview(null);
      setMessage(strings.backup.restored);
      onRestored?.();
    } catch (error) {
      setPreview(null);
      if (error instanceof ImportCancelledError) {
        setMessage(strings.backup.importCancelled);
      } else {
        setMessage(strings.common.notSaved);
        void logError('backup.import', error);
      }
    } finally {
      setBusy(false);
    }
  };

  const counts = preview
    ? (Object.keys(strings.backup.counts) as (keyof typeof strings.backup.counts)[]).filter(
        (key) => preview.counts[key] > 0,
      )
    : [];

  return (
    <div className="flex flex-col gap-1">
      <button type="button" className={className} onClick={() => void pick()}>
        {label}
      </button>
      {message && (
        <p role="status" className="text-sm text-muted">
          {message}
        </p>
      )}
      {errors && (
        <div role="alert" className="text-sm text-danger">
          <p>{strings.backup.invalid}</p>
          <ul className="list-disc pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      <ConfirmDialog
        open={preview !== null}
        title={strings.backup.previewTitle}
        confirmLabel={strings.backup.replace}
        danger
        busy={busy}
        onConfirm={() => void confirm()}
        onCancel={() => setPreview(null)}
      >
        {preview && (
          <>
            <p>{strings.backup.previewText(formatDateTime(preview.exportedAt))}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
              {counts.map((key) => (
                <div key={key} className="contents">
                  <dt className="text-muted">{strings.backup.counts[key]}</dt>
                  <dd className="text-right tabular-nums">{preview.counts[key]}</dd>
                </div>
              ))}
            </dl>
            {unsaved && unsaved.total > 0 && (
              <p className="mt-3 text-amber-300">{strings.backup.unsavedWarning(unsaved.total)}</p>
            )}
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}

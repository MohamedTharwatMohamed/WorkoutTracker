import { RestoreButton } from '../components/Backup';
import { clearMarker } from '../platform/storage';
import { strings } from '../strings';
import { rememberCounts } from '../data/metaRepository';

/** CUJ 7: the browser seems to have wiped the data. */
export function DataClearedScreen({ onResolved }: { onResolved: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="heading text-amber-300">{strings.cleared.title}</h1>
      <p>{strings.cleared.text}</p>
      <RestoreButton
        className="btn-primary w-full"
        onRestored={() => {
          void rememberCounts().finally(onResolved);
        }}
      />
      <button
        type="button"
        className="btn-secondary"
        onClick={() => {
          clearMarker();
          onResolved();
        }}
      >
        {strings.cleared.startFresh}
      </button>
    </main>
  );
}

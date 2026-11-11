import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadCatalog } from './data/catalog';
import { openDatabase, type OpenResult } from './db/open';
import './index.css';
import { installHandlers } from './platform/errorLog';
import { captureInstallPrompt } from './platform/install';
import { applyTheme, watchSystemTheme } from './theme';
import { DataClearedScreen } from './screens/DataClearedScreen';
import { RecoveryScreen } from './screens/RecoveryScreen';

applyTheme();
watchSystemTheme();
installHandlers();
captureInstallPrompt();
// Machine lists wait for the catalog; start the fetch while the database opens.
void loadCatalog().catch(() => undefined);

function Root({ result }: { result: OpenResult }) {
  const [kind, setKind] = useState(result.kind);
  if (result.kind === 'failed') return <RecoveryScreen error={result.error} />;
  if (kind === 'cleared') return <DataClearedScreen onResolved={() => setKind('ok')} />;
  return <App />;
}

void openDatabase().then((result) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Root result={result} />
    </StrictMode>,
  );
});

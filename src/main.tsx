import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { strings } from './strings';

// Placeholder shell until phase P5 (items 19 and 20).
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main className="flex min-h-dvh items-center justify-center">
      <h1 className="font-display text-4xl uppercase tracking-wide text-accent">
        {strings.appName}
      </h1>
    </main>
  </StrictMode>,
);

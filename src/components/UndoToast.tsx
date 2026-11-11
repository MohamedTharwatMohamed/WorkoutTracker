import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { logError } from '../platform/errorLog';
import { strings } from '../strings';

export const UNDO_MS = 5000;

interface Toast {
  id: number;
  message: string;
  undo: () => Promise<unknown>;
}

const UndoContext = createContext<(message: string, undo: () => Promise<unknown>) => void>(() => {});

/** Shows a 5-second toast with Undo. A new toast replaces the previous one. */
export function useUndo() {
  return useContext(UndoContext);
}

export function UndoProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const nextId = useRef(0);

  const show = useCallback((message: string, undo: () => Promise<unknown>) => {
    nextId.current += 1;
    setToast({ id: nextId.current, message, undo });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast((t) => (t?.id === toast.id ? null : t)), UNDO_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const undo = async () => {
    if (!toast) return;
    setToast(null);
    try {
      await toast.undo();
    } catch (error) {
      void logError('undo', error);
    }
  };

  return (
    <UndoContext.Provider value={show}>
      {children}
      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-text p-2 pl-4 text-bg shadow-xl lg:bottom-6"
        >
          <span className="font-semibold">{toast.message}</span>
          <button type="button" className="btn bg-bg text-accent" onClick={() => void undo()}>
            {strings.common.undo}
          </button>
        </div>
      )}
    </UndoContext.Provider>
  );
}

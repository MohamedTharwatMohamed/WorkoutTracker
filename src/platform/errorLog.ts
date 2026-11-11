import * as diagnosticsRepository from '../data/diagnosticsRepository';
import type { ErrorEntry } from '../db/types';

export const MAX_ERRORS = 500;

const memory: ErrorEntry[] = [];

/** Errors that could not be written to the database. */
export function memoryErrors(): readonly ErrorEntry[] {
  return memory;
}

export function clearMemoryErrors(): void {
  memory.length = 0;
}

function toEntry(kind: string, error: unknown): ErrorEntry {
  const at = new Date().toISOString();
  if (error instanceof Error) {
    return { at, kind, message: `${error.name}: ${error.message}`, stack: error.stack };
  }
  let message: string;
  try {
    message = typeof error === 'string' ? error : JSON.stringify(error);
  } catch {
    message = String(error);
  }
  return { at, kind, message: message ?? String(error) };
}

/** Never throws: falls back to memory when the database is unavailable. */
export async function logError(kind: string, error: unknown): Promise<void> {
  const entry = toEntry(kind, error);
  try {
    await diagnosticsRepository.addError(entry, MAX_ERRORS);
  } catch {
    memory.push(entry);
    if (memory.length > MAX_ERRORS) memory.shift();
  }
}

export function installHandlers(target: Window = window): () => void {
  const onError = (event: ErrorEvent) => {
    void logError('error', event.error ?? event.message);
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    void logError('unhandledrejection', event.reason);
  };
  target.addEventListener('error', onError);
  target.addEventListener('unhandledrejection', onRejection);
  return () => {
    target.removeEventListener('error', onError);
    target.removeEventListener('unhandledrejection', onRejection);
  };
}

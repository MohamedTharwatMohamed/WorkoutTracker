import { APP_BUILD, BACKUP_FORMAT_VERSION, BUILD_TIME, SCHEMA_VERSION } from '../buildInfo';
import { loadCatalog } from '../data/catalog';
import * as diagnosticsRepository from '../data/diagnosticsRepository';
import * as sessionRepository from '../data/sessionRepository';
import * as setRepository from '../data/setRepository';
import type { ErrorEntry } from '../db/types';
import { checkConsistency, isClean, type ConsistencyReport } from '../domain/consistency';
import { USAGE_WINDOW_DAYS, usageSummary, type UsageSummary } from '../domain/usage';
import { memoryErrors } from './errorLog';
import { isStandalone, platform, type Platform } from './install';
import { shareOrDownload, type ShareResult } from './share';
import { status } from './storage';

/** Versions, environment and health only. Holds no set, measurement or profile values. */
export interface Diagnostics {
  generatedAt: string;
  appBuild: string;
  buildTime: string;
  schemaVersion: number;
  backupFormatVersion: number;
  catalogVersion: number | null;
  userAgent: string;
  platform: Platform;
  installed: boolean;
  storage: { persisted: boolean; usage?: number; quota?: number };
  counts: Record<string, number>;
  consistency: ConsistencyReport & { clean: boolean };
  errors: ErrorEntry[];
  usageSummary: UsageSummary;
}

async function catalogVersion(): Promise<number | null> {
  try {
    return (await loadCatalog()).catalogVersion;
  } catch {
    return null;
  }
}

export async function buildDiagnostics(): Promise<Diagnostics> {
  const now = new Date();
  const since = new Date(now.getTime() - USAGE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const [catalog, storage, counts, journal, sets, errors, recentSessions, recentSets] =
    await Promise.all([
      catalogVersion(),
      status(),
      diagnosticsRepository.counts(),
      diagnosticsRepository.journal(),
      diagnosticsRepository.allSets({ includeDeleted: true }),
      diagnosticsRepository.errors(),
      sessionRepository.listSince(since),
      setRepository.listSince(since),
    ]);
  const report = checkConsistency(journal, sets);

  return {
    generatedAt: now.toISOString(),
    appBuild: APP_BUILD,
    buildTime: BUILD_TIME,
    schemaVersion: SCHEMA_VERSION,
    backupFormatVersion: BACKUP_FORMAT_VERSION,
    catalogVersion: catalog,
    userAgent: navigator.userAgent,
    platform: platform(),
    installed: isStandalone(),
    storage,
    counts,
    consistency: { ...report, clean: isClean(report) },
    errors: [...errors, ...memoryErrors()],
    usageSummary: usageSummary(recentSessions, recentSets, now.toISOString()),
  };
}

export async function exportDiagnostics(): Promise<ShareResult> {
  const diagnostics = await buildDiagnostics();
  const name = `workout-diagnostics-${diagnostics.generatedAt.slice(0, 10)}.json`;
  const file = new File([JSON.stringify(diagnostics, null, 2)], name, { type: 'application/json' });
  return shareOrDownload(file);
}

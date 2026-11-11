import { useLiveQuery } from 'dexie-react-hooks';
import * as metaRepository from '../data/metaRepository';
import { strings } from '../strings';
import { BackupButton } from './Backup';
import { Banner } from './Banner';

export const BACKUP_DUE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Sets not backed up for N sets and over 7 days since the last backup (or since install). */
export async function backupDue(now = Date.now()): Promise<number> {
  const { sets } = await metaRepository.changesSinceExport();
  if (sets < 1) return 0;
  const last = (await metaRepository.get('lastExportAt')) ?? (await metaRepository.get('installedAt'));
  if (typeof last !== 'string') return sets;
  return now - Date.parse(last) > BACKUP_DUE_DAYS * DAY_MS ? sets : 0;
}

export function BackupBanner() {
  const sets = useLiveQuery(() => backupDue(), []);
  if (!sets) return null;
  return (
    <Banner tone="warning" actions={<BackupButton />}>
      {strings.banners.backupDue(sets)}
    </Banner>
  );
}

import { useLiveQuery } from 'dexie-react-hooks';
import * as sessionRepository from '../data/sessionRepository';
import { useAppUpdate } from '../platform/updates';
import { strings } from '../strings';
import { Banner } from './Banner';

/** Offers the new build, but never while a session is open so a reload can't interrupt logging. */
export function UpdateBanner() {
  const { needRefresh, update } = useAppUpdate();
  const open = useLiveQuery(async () => (await sessionRepository.getOpen()) ?? null, []);
  if (!needRefresh || open !== null) return null;
  return (
    <Banner
      actions={
        <button type="button" className="btn-primary" onClick={() => void update()}>
          {strings.common.reload}
        </button>
      }
    >
      {strings.banners.updateAvailable}
    </Banner>
  );
}

import { useLiveQuery } from 'dexie-react-hooks';
import * as photoRepository from '../data/photoRepository';
import type { MachineView } from '../data/machineRepository';
import type { Photo } from '../data/types';

// Photos are small (≤ 50 KB) and few, so object URLs are kept for the page's lifetime.
// Revoking in an effect cleanup breaks images under StrictMode's double effects.
const urls = new Map<string, string>();
function urlFor(photo: Photo): string {
  const key = `${photo.id}:${photo.updatedAt}`;
  let url = urls.get(key);
  if (!url) {
    url = URL.createObjectURL(photo.blob);
    urls.set(key, url);
  }
  return url;
}

/** The user's photo, then the catalog photo, then the muscle-group icon. */
export function MachineImage({
  machine,
  className = 'size-20',
}: {
  machine: Pick<MachineView, 'name' | 'image' | 'photoId' | 'muscleGroup'>;
  className?: string;
}) {
  const photo = useLiveQuery(
    async () => (machine.photoId ? ((await photoRepository.get(machine.photoId)) ?? null) : null),
    [machine.photoId],
  );
  const src = photo ? urlFor(photo) : machine.image;

  if (src) {
    return (
      <img
        src={src}
        alt={machine.name}
        loading="lazy"
        className={`${className} shrink-0 rounded-xl bg-white object-contain`}
      />
    );
  }
  const icon = `url(/images/muscles/${machine.muscleGroup}.svg)`;
  return (
    <div
      role="img"
      aria-label={machine.name}
      className={`${className} shrink-0 rounded-xl bg-bg p-3 ring-1 ring-white/10`}
    >
      <div
        className="size-full bg-accent"
        style={{
          maskImage: icon,
          WebkitMaskImage: icon,
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
          maskSize: 'contain',
        }}
      />
    </div>
  );
}

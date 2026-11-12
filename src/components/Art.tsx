type Photo = { src: string; credit: string; url?: string };

export const PHOTOS = {
  tirePush: {
    src: '/images/people/tire-push.webp',
    credit: 'Supplied by the project owner',
  },
  shoulderPress: {
    src: '/images/people/shoulder-press.webp',
    credit: 'Luis Morales Torres / Pexels',
    url: 'https://www.pexels.com/photo/man-exercising-with-shoulder-press-machine-in-gym-34669288/',
  },
  cableCrossover: {
    src: '/images/people/cable-crossover.webp',
    credit: 'Supplied by the project owner',
  },
} satisfies Record<string, Photo>;

/** Real athlete photo that fades into the card from the left. */
export function HeroPhoto({ photo, className = '' }: { photo: keyof typeof PHOTOS; className?: string }) {
  const fade = 'linear-gradient(to right, transparent, #000 45%), linear-gradient(to top, transparent, #000 25%)';
  return (
    <img
      src={PHOTOS[photo].src}
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
      className={`pointer-events-none object-cover object-top ${className}`}
      style={{ maskImage: fade, WebkitMaskImage: fade, maskComposite: 'intersect', WebkitMaskComposite: 'source-in' }}
    />
  );
}
/** Diagonal accent hatching for hero areas. */
export function Stripes({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`stripes pointer-events-none ${className}`} />;
}

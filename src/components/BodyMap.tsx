import { useId } from 'react';
import Body, { type ExtendedBodyPart, type Slug } from 'react-muscle-highlighter';
import type { MuscleGroup } from '../data/types';
import { regionLevels, type MuscleRegion } from '../domain/muscles';
import { strings } from '../strings';
import { useResolvedTheme } from '../theme';

const PALETTE = {
  dark: { base: '#2a313b', gap: '#161a20', outline: '#4a5360', hit: [255, 59, 48] },
  light: { base: '#d3d9e1', gap: '#ffffff', outline: '#9aa3ae', hit: [220, 38, 38] },
} as const;

type Props = {
  /** Per muscle group, 0–1. */
  levels?: Partial<Record<MuscleGroup, number>>;
  /** Per region, 0–1. Takes precedence over `levels`. */
  regions?: ReadonlyMap<MuscleRegion, number>;
  /** Primary regions pulse gently, e.g. on a machine page. */
  pulse?: readonly MuscleRegion[];
  className?: string;
};

/** Anatomical front and back figures with muscles shaded by level. */
export function BodyMap({ levels = {}, regions, pulse = [], className = '' }: Props) {
  const id = useId();
  const theme = useResolvedTheme();
  const p = PALETTE[theme];
  const shade = regions ?? regionLevels(levels);
  const color = (level: number) => `rgba(${p.hit.join(',')},${(0.25 + 0.75 * level).toFixed(2)})`;
  const data: ExtendedBodyPart[] = [...shade]
    .filter(([, level]) => level > 0)
    .map(([slug, level]) => ({ slug: slug as Slug, color: color(level) }));
  const pulsing = new Set(pulse.map((r) => color(shade.get(r) ?? 1)));

  const figure = (side: 'front' | 'back') => (
    <figure className="flex flex-col items-center gap-1">
      <div className="body-figure w-full [&_svg]:h-auto [&_svg]:w-full">
        <Body
          data={data}
          side={side}
          gender="male"
          defaultFill={p.base}
          defaultStroke={p.gap}
          defaultStrokeWidth={2}
          border={p.outline}
        />
      </div>
      <figcaption className="text-[10px] tracking-[0.2em] text-muted uppercase">{strings.bodyMap[side]}</figcaption>
    </figure>
  );

  return (
    <div
      role="img"
      aria-label={strings.bodyMap.label}
      data-map={id}
      className={`grid grid-cols-2 gap-3 ${className}`}
    >
      <style>
        {[...pulsing].map((fill) => `[data-map="${id}"] path[fill="${fill}"]{animation:muscle-pulse 1.6s ease-in-out infinite}`).join('')}
      </style>
      {figure('front')}
      {figure('back')}
    </div>
  );
}

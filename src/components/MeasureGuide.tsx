import Body from 'react-muscle-highlighter';
import type { Site } from '../data/types';
import { strings } from '../strings';
import { useResolvedTheme } from '../theme';

const PALETTE = {
  dark: { base: '#2a313b', gap: '#161a20', outline: '#4a5360', tape: '#c6ff00' },
  light: { base: '#d3d9e1', gap: '#ffffff', outline: '#9aa3ae', tape: '#4f8a00' },
} as const;

/** Tape loops in the library's male front viewBox (0 0 724 1448). */
const TAPE: Record<Exclude<Site, 'weight'>, { cx: number; cy: number; rx: number; ry: number }> = {
  neck: { cx: 364, cy: 288, rx: 38, ry: 9 },
  chest: { cx: 364, cy: 392, rx: 116, ry: 18 },
  waist: { cx: 364, cy: 560, rx: 100, ry: 15 },
  hips: { cx: 364, cy: 668, rx: 118, ry: 18 },
  arm: { cx: 203, cy: 452, rx: 28, ry: 7 },
  thigh: { cx: 300, cy: 760, rx: 60, ry: 12 },
  calf: { cx: 288, cy: 1085, rx: 40, ry: 9 },
};

/** Ellipse as two arcs: the back half (top) and the front half (bottom). */
const arc = ({ cx, cy, rx }: { cx: number; cy: number; rx: number; ry: number }, ry: number, sweep: 0 | 1) =>
  `M${cx - rx} ${cy} A${rx} ${ry} 0 0 ${sweep} ${cx + rx} ${cy}`;

/** Animated figure showing where and how to measure one body site. */
export function MeasureGuide({ site, className = '' }: { site: Site; className?: string }) {
  const p = PALETTE[useResolvedTheme()];
  const tape = site === 'weight' ? null : TAPE[site];

  return (
    <figure className={`flex items-center gap-4 ${className}`}>
      <div role="img" aria-label={strings.measureGuide.label(strings.sites[site])} className="relative w-28 shrink-0 sm:w-36">
        <div className="body-figure [&_svg]:h-auto [&_svg]:w-full">
          <Body data={[]} side="front" gender="male" defaultFill={p.base} defaultStroke={p.gap} defaultStrokeWidth={2} border={p.outline} />
        </div>
        <svg viewBox="0 0 724 1448" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          {tape ? (
            <g key={site} fill="none" stroke={p.tape} strokeLinecap="round">
              <ellipse cx={tape.cx} cy={tape.cy} rx={tape.rx + 14} ry={tape.ry + 10} strokeWidth={20} opacity={0.18} style={{ animation: 'tape-glow 1.8s ease-in-out infinite' }} />
              <path d={arc(tape, tape.ry, 1)} strokeWidth={6} strokeDasharray="10 10" opacity={0.6} />
              <path
                d={arc(tape, tape.ry, 0)}
               
                pathLength={100}
                strokeWidth={10}
                strokeDasharray="100"
                style={{ animation: 'tape-wrap 2.4s ease-in-out infinite' }}
              />
              <rect x={tape.cx + tape.rx - 6} y={tape.cy - 14} width={26} height={28} rx={5} fill={p.tape} stroke="none" />
            </g>
          ) : (
            <g key="scale" style={{ animation: 'scale-press 2.4s ease-in-out infinite' }}>
              <rect x={226} y={1342} width={276} height={44} rx={14} fill={p.tape} opacity={0.9} />
              <rect x={318} y={1352} width={92} height={24} rx={5} fill={p.gap} />
              <text x={364} y={1371} textAnchor="middle" fontSize={22} fontFamily="monospace" fill={p.tape}>
                00.0
              </text>
            </g>
          )}
        </svg>
      </div>
      <figcaption className="flex flex-col gap-1 text-sm">
        <span className="font-display text-xl uppercase">{strings.sites[site]}</span>
        <span>{strings.measureHints[site]}</span>
        <span className="text-xs text-muted">{site === 'weight' ? strings.measureGuide.weightTip : strings.measureGuide.tapeTip}</span>
      </figcaption>
    </figure>
  );
}

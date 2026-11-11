import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDate, formatNumber } from '../format';

/** Line chart of one measurement series, values already in display units. */
export default function TrendChart({
  points,
  unit,
}: {
  points: { date: string; value: number }[];
  unit: string;
}) {
  const data = points.map((p) => ({ t: Date.parse(p.date), value: p.value }));
  return (
    <div className="h-48 w-full" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="var(--color-line)" strokeOpacity={0.08} vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(t: number) => formatDate(new Date(t).toISOString())}
            stroke="var(--color-muted)"
            fontSize={11}
            minTickGap={24}
          />
          <YAxis domain={['auto', 'auto']} stroke="var(--color-muted)" fontSize={11} />
          <Tooltip
            contentStyle={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: 'none', borderRadius: 12 }}
            labelFormatter={(t) => formatDate(new Date(Number(t)).toISOString())}
            formatter={(v) => [`${formatNumber(Number(v))} ${unit}`, '']}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--accent-text, var(--color-accent))"
            strokeWidth={3}
            dot={{ r: 3, fill: 'var(--accent-text, var(--color-accent))' }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

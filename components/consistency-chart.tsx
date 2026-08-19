'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { ChartRow } from '@/lib/insights';

// One distinct hue per apparatus, resolved from the CSS variables defined in
// globals.css so each has a light/dark variant. Floor (blue) and Rings (green)
// are now clearly different.
const APPARATUS_COLORS: Record<string, string> = {
  floor_exercise: 'hsl(var(--chart-floor))',
  pommel_horse: 'hsl(var(--chart-pommel))',
  still_rings: 'hsl(var(--chart-rings))',
  vault: 'hsl(var(--chart-vault))',
  parallel_bars: 'hsl(var(--chart-pbars))',
  high_bar: 'hsl(var(--chart-highbar))',
  uneven_bars: 'hsl(var(--chart-ubars))',
  balance_beam: 'hsl(var(--chart-beam))',
};

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Format an ISO `YYYY-MM-DD` date as `Mon DD` without going through the Date
 * constructor, which would apply a timezone offset and can shift the day.
 */
function formatDate(value: string | null): string {
  if (!value) return '—';
  const [, m, d] = value.split('-');
  const month = MONTHS[Number(m) - 1];
  if (!month || !d) return value;
  return `${month} ${Number(d)}`;
}

interface ConsistencyChartProps {
  data: ChartRow[];
  /** Apparatus to draw, in display order (already filtered to those with data). */
  apparatus: { id: string; label: string }[];
}

export function ConsistencyChart({ data, apparatus }: ConsistencyChartProps) {
  const config: ChartConfig = Object.fromEntries(
    apparatus.map((a) => [
      a.id,
      { label: a.label, color: APPARATUS_COLORS[a.id] ?? '#64748b' },
    ])
  );

  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-[360px] w-full sm:h-[440px] lg:h-[520px]"
    >
      <LineChart data={data} margin={{ top: 12, right: 16, bottom: 8, left: 4 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis
          domain={['dataMin - 0.5', 'dataMax + 0.5']}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={44}
          allowDecimals
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_label, payload) =>
                formatDate(
                  (payload?.[0]?.payload as ChartRow | undefined)?.date ?? null
                )
              }
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {apparatus.map((a) => (
          <Line
            key={a.id}
            dataKey={a.id}
            type="monotone"
            stroke={`var(--color-${a.id})`}
            strokeWidth={2}
            dot={{ r: 2.5 }}
            activeDot={{ r: 4 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';
import { Trophy } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RINGS, type SetupGroup, type TrendPoint } from '@/lib/stats';
import { formatDate, formatNumber, formatPercent } from '@/lib/format';

const METRICS = {
  arrowAverage: {
    label: 'Arrow average',
    help: 'Points per arrow (0–10). Fair across cards with different arrow counts.',
    format: (v: number) => formatNumber(v),
    domain: [0, 10] as [number, number],
  },
  percentOfMax: {
    label: '% of max',
    help: 'Score as a share of the best possible score.',
    format: (v: number) => formatPercent(v),
    domain: [0, 1] as [number, number],
  },
  hitRate: {
    label: 'Hit rate',
    help: 'Share of arrows that scored (not a miss).',
    format: (v: number) => formatPercent(v),
    domain: [0, 1] as [number, number],
  },
  endStdDev: {
    label: 'Consistency',
    help: 'Spread of end scores. Lower is steadier.',
    format: (v: number) => `±${formatNumber(v, 1)}`,
    domain: [0, 'auto'] as [number, 'auto'],
  },
} as const;
type Metric = keyof typeof METRICS;

const RING_LABELS: Record<(typeof RINGS)[number], string> = {
  gold: 'Gold (9–10)',
  red: 'Red (7–8)',
  blue: 'Blue (5–6)',
  black: 'Black (3–4)',
  white: 'White (1–2)',
  miss: 'Miss',
};

export function InsightsView({
  groups,
  trends,
}: {
  groups: SetupGroup[];
  trends: Record<string, TrendPoint[]>;
}) {
  const [setup, setSetup] = useState(groups[0].key);
  const [metric, setMetric] = useState<Metric>('arrowAverage');
  const points = trends[setup] ?? [];
  const m = METRICS[metric];

  const first = points[0];
  const last = points[points.length - 1];
  const best = points.reduce<TrendPoint | null>(
    (b, p) => (!b || p.arrowAverage > b.arrowAverage ? p : b),
    null,
  );

  const lineConfig: ChartConfig = {
    [metric]: { label: m.label, color: 'hsl(var(--chart-1))' },
  };
  const ringConfig: ChartConfig = Object.fromEntries(
    RINGS.map((r) => [r, { label: RING_LABELS[r], color: `hsl(var(--face-${r}))` }]),
  );
  const ringData = points.map((p) => ({
    date: p.date,
    name: p.name,
    ...Object.fromEntries(RINGS.map((r) => [r, Math.round(p.rings[r] * 1000) / 10])),
  }));

  // Two-round events: does the archer finish stronger or weaker?
  const twoRound = points.filter((p) => p.roundTotals.length >= 2);
  const secondBetter = twoRound.filter((p) => p.roundTotals[1] > p.roundTotals[0]).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={setup} onValueChange={setSetup}>
          <SelectTrigger className="w-full sm:w-[340px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {groups.map((g) => (
              <SelectItem key={g.key} value={g.key}>
                {g.label} ({g.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Scorecards" value={String(points.length)} />
        <SummaryTile
          label="Best arrow average"
          value={best ? formatNumber(best.arrowAverage) : '—'}
          sub={best ? best.name : undefined}
        />
        <SummaryTile
          label="Latest"
          value={last ? formatNumber(last.arrowAverage) : '—'}
          sub={last ? formatDate(last.date) : undefined}
        />
        <SummaryTile
          label="Change since first"
          value={
            first && last && points.length > 1
              ? `${last.arrowAverage >= first.arrowAverage ? '+' : ''}${formatNumber(
                  last.arrowAverage - first.arrowAverage,
                )}`
              : '—'
          }
          sub="points per arrow"
        />
      </div>

      <Card>
        <CardHeader className="pb-2 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Over time</CardTitle>
            <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
              <TabsList>
                {(Object.keys(METRICS) as Metric[]).map((k) => (
                  <TabsTrigger key={k} value={k} className="text-xs">
                    {METRICS[k].label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <p className="text-xs text-muted-foreground">{m.help}</p>
        </CardHeader>
        <CardContent>
          {points.length < 2 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              One scorecard so far in this setup. Import another to see a trend.
            </p>
          ) : (
            <ChartContainer config={lineConfig} className="aspect-auto h-[320px] w-full">
              <LineChart data={points} margin={{ top: 12, right: 16, bottom: 8, left: 4 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => formatDate(v, true)}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                />
                <YAxis
                  domain={m.domain}
                  tickFormatter={(v) => m.format(v)}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_l, payload) => {
                        const p = payload?.[0]?.payload as TrendPoint | undefined;
                        return p ? `${p.name} · ${formatDate(p.date, true)}` : '';
                      }}
                      formatter={(value, _name, item) => {
                        const p = item.payload as TrendPoint;
                        return (
                          <div className="flex w-full justify-between gap-4">
                            <span className="text-muted-foreground">{m.label}</span>
                            <span className="font-mono font-medium">
                              {m.format(Number(value))}
                              {metric === 'arrowAverage' && ` (${p.total}/${p.maxScore})`}
                            </span>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Line
                  dataKey={metric}
                  type="monotone"
                  stroke={`var(--color-${metric})`}
                  strokeWidth={2}
                  isAnimationActive={false}
                  dot={(props: { cx?: number; cy?: number; payload?: TrendPoint; index?: number }) => {
                    const { cx, cy, payload, index } = props;
                    if (cx == null || cy == null) return <g key={index} />;
                    const pb = payload?.personalBest && index !== 0;
                    return (
                      <circle
                        key={index}
                        cx={cx}
                        cy={cy}
                        r={pb ? 5 : 3}
                        fill={pb ? 'hsl(var(--secondary))' : `var(--color-${metric})`}
                        stroke="hsl(var(--background))"
                        strokeWidth={pb ? 2 : 0}
                      />
                    );
                  }}
                />
              </LineChart>
            </ChartContainer>
          )}
          {points.length >= 2 && (
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-secondary" />
              New personal best (arrow average)
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Where the arrows landed</CardTitle>
          <p className="text-xs text-muted-foreground">
            Share of arrows in each target color, per scorecard. Watch the grey
            shrink and the gold grow.
          </p>
        </CardHeader>
        <CardContent>
          <ChartContainer config={ringConfig} className="aspect-auto h-[280px] w-full">
            <BarChart data={ringData} margin={{ top: 8, right: 16, bottom: 8, left: 4 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => formatDate(v, true)}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_l, payload) =>
                      (payload?.[0]?.payload as { name?: string })?.name ?? ''
                    }
                    formatter={(value, name) => (
                      <div className="flex w-full justify-between gap-4">
                        <span className="text-muted-foreground">
                          {RING_LABELS[name as keyof typeof RING_LABELS]}
                        </span>
                        <span className="font-mono">{Number(value)}%</span>
                      </div>
                    )}
                  />
                }
              />
              {RINGS.map((r) => (
                <Bar
                  key={r}
                  dataKey={r}
                  stackId="rings"
                  fill={`var(--color-${r})`}
                  stroke={r === 'white' ? 'hsl(var(--border))' : undefined}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Scorecards in this setup</CardTitle>
          {twoRound.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Round 2 beat round 1 in {secondBetter} of {twoRound.length}{' '}
              two-round events.
            </p>
          )}
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="py-1 text-left font-medium">Event</th>
                <th className="py-1 text-right font-medium">Rounds</th>
                <th className="py-1 text-right font-medium">Score</th>
                <th className="py-1 text-right font-medium">Avg</th>
                <th className="py-1 text-right font-medium hidden sm:table-cell">Hits</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.eventId} className="border-t">
                  <td className="py-2 pr-2">
                    <Link href={`/events/${p.eventId}`} className="hover:underline">
                      {p.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(p.date)}
                    </div>
                  </td>
                  <td className="py-2 text-right text-muted-foreground">
                    {p.roundTotals.join(' / ')}
                  </td>
                  <td className="py-2 text-right font-medium">
                    {p.total}
                    <span className="text-muted-foreground">/{p.maxScore}</span>
                  </td>
                  <td className="py-2 text-right">
                    <span className="inline-flex items-center gap-1">
                      {p.personalBest && p !== points[0] && (
                        <Trophy className="h-3 w-3 text-secondary" />
                      )}
                      {formatNumber(p.arrowAverage)}
                    </span>
                  </td>
                  <td className="py-2 text-right hidden sm:table-cell">
                    {formatPercent(p.hitRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
      </CardContent>
    </Card>
  );
}

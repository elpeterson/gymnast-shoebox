'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MAG_APPARATUS, WAG_APPARATUS } from '@/lib/constants';
import {
  computeConsistency,
  consistencyLabel,
  MIN_POINTS_FOR_SCORE,
  type ApparatusConsistency,
  type CompetitionWithScores,
} from '@/lib/consistency';

interface ConsistencyViewProps {
  competitions: CompetitionWithScores[];
  discipline: string;
}

const CHART_W = 320;
const CHART_H = 96;
const PAD_X = 6;
const PAD_Y = 10;

export function ConsistencyView({
  competitions,
  discipline,
}: ConsistencyViewProps) {
  const apparatusConfig = discipline === 'WAG' ? WAG_APPARATUS : MAG_APPARATUS;

  const results = useMemo(
    () =>
      computeConsistency(
        competitions,
        apparatusConfig.map((a) => a.id)
      ),
    [competitions, apparatusConfig]
  );

  const labelFor = (id: string) =>
    apparatusConfig.find((a) => a.id === id)?.label ?? id;

  const anyData = results.some((r) => r.count > 0);

  if (!anyData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No scores yet</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Consistency needs a few scored competitions to work with. Add or
          import some meets and your per-apparatus trends will show up here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {results.map((r) => (
        <ApparatusCard key={r.apparatus} result={r} label={labelFor(r.apparatus)} />
      ))}
    </div>
  );
}

function ApparatusCard({
  result,
  label,
}: {
  result: ApparatusConsistency;
  label: string;
}) {
  const { count, mean, stdDev, consistencyScore, best, hitRate } = result;
  const badge = consistencyLabel(consistencyScore);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-baseline justify-between gap-2">
          <CardTitle className="text-lg">{label}</CardTitle>
          {consistencyScore !== null ? (
            <span
              className="text-sm font-medium tabular-nums"
              title="0–100 consistency score (higher is steadier)"
            >
              {consistencyScore}
              <span className="text-muted-foreground">/100</span>
              {badge ? (
                <span className="ml-2 text-xs text-muted-foreground">
                  {badge}
                </span>
              ) : null}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Needs {MIN_POINTS_FOR_SCORE}+ meets
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Sparkline result={result} />
        <dl className="grid grid-cols-4 gap-2 text-center">
          <Stat label="Meets" value={String(count)} />
          <Stat label="Average" value={count ? mean.toFixed(3) : '—'} />
          <Stat label="Best" value={count ? best.toFixed(3) : '—'} />
          <Stat
            label="Spread"
            value={consistencyScore !== null ? `±${stdDev.toFixed(3)}` : '—'}
          />
        </dl>
        {consistencyScore !== null ? (
          <p className="text-xs text-muted-foreground">
            Hit within 0.5 of best in{' '}
            <span className="font-medium text-foreground">
              {Math.round(hitRate * 100)}%
            </span>{' '}
            of meets.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dd className="text-sm font-semibold tabular-nums">{value}</dd>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
    </div>
  );
}

/**
 * Dependency-free line chart: the score series over time, with a shaded
 * mean ± 1 std-dev band so the eye reads the band's tightness as consistency.
 */
function Sparkline({ result }: { result: ApparatusConsistency }) {
  const { points, mean, stdDev } = result;

  if (points.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
        No scores recorded
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const lo = Math.min(...values, mean - stdDev);
  const hi = Math.max(...values, mean + stdDev);
  const span = hi - lo || 1; // avoid divide-by-zero when all equal

  const innerW = CHART_W - PAD_X * 2;
  const innerH = CHART_H - PAD_Y * 2;

  const x = (i: number) =>
    points.length === 1
      ? CHART_W / 2
      : PAD_X + (i / (points.length - 1)) * innerW;
  const y = (v: number) => PAD_Y + (1 - (v - lo) / span) * innerH;

  const bandTop = y(mean + stdDev);
  const bandBottom = y(mean + -stdDev);
  const meanY = y(mean);

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full"
      role="img"
      aria-label={`${result.apparatus} score trend across ${points.length} meets`}
      preserveAspectRatio="none"
    >
      {stdDev > 0 ? (
        <rect
          x={PAD_X}
          y={bandTop}
          width={CHART_W - PAD_X * 2}
          height={Math.max(0, bandBottom - bandTop)}
          className="fill-primary/10"
        />
      ) : null}
      <line
        x1={PAD_X}
        x2={CHART_W - PAD_X}
        y1={meanY}
        y2={meanY}
        className="stroke-muted-foreground/40"
        strokeDasharray="3 3"
        strokeWidth={1}
      />
      <path
        d={linePath}
        fill="none"
        className="stroke-primary"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <circle
          key={p.competitionId + i}
          cx={x(i)}
          cy={y(p.value)}
          r={2.5}
          className="fill-primary"
        >
          <title>
            {p.competitionName}: {p.value.toFixed(3)}
          </title>
        </circle>
      ))}
    </svg>
  );
}

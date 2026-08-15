type ProgressPoint = {
  label: string;
  score: number;
};

export function ProgressChart({ label, points }: { label: string; points: ProgressPoint[] }) {
  if (points.length < 2) return null;

  const width = 560;
  const height = 150;
  const padding = 18;
  const values = points.map((point) => point.score);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spread = Math.max(maximum - minimum, 0.5);
  const coordinates = points.map((point, index) => {
    const x = padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((point.score - minimum) / spread) * (height - padding * 2);
    return { ...point, x, y };
  });
  const improvement = points.at(-1)!.score - points[0].score;

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="font-medium">{label}</h3>
        <p className="text-xs text-muted-foreground">
          Best {maximum.toFixed(3)} · {improvement >= 0 ? '+' : ''}{improvement.toFixed(3)} overall
        </p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} score trend`} className="h-36 w-full overflow-visible">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="stroke-border" />
        <polyline
          points={coordinates.map((point) => `${point.x},${point.y}`).join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-primary"
        />
        {coordinates.map((point) => (
          <g key={`${point.label}-${point.x}`}>
            <circle cx={point.x} cy={point.y} r="4" fill="currentColor" className="text-secondary" />
            <title>{point.label}: {point.score.toFixed(3)}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}

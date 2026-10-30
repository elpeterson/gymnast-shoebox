import { ArrowChip } from '@/components/arrow-chip';
import { arrowValue } from '@/lib/stats';

type Round = {
  round_number: number;
  total: number;
  bonus?: number[];
  ends: { end_number: number; arrows: string[] }[];
};

/** A round laid out like the paper scorecard, with target-colored arrows. */
export function ScorecardGrid({
  round,
  bonusLabels,
}: {
  round: Round;
  bonusLabels: string[];
}) {
  const ends = [...round.ends].sort((a, b) => a.end_number - b.end_number);
  // End sums and running totals, worked out before render (no mutation in JSX).
  const sums = ends.map((end) => end.arrows.reduce((s, a) => s + arrowValue(a), 0));
  const runningTotals = sums.map((_, i) => sums.slice(0, i + 1).reduce((s, v) => s + v, 0));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="py-1 pr-2 text-left font-medium">End</th>
            <th className="py-1 text-left font-medium">Arrows</th>
            <th className="py-1 px-2 text-right font-medium">Sum</th>
            <th className="py-1 pl-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {ends.map((end, i) => {
            const sum = sums[i];
            return (
              <tr key={end.end_number} className="border-t">
                <td className="py-1.5 pr-2 text-muted-foreground">
                  {end.end_number}
                </td>
                <td className="py-1.5">
                  <div className="flex gap-1">
                    {end.arrows.map((a, i) => (
                      <ArrowChip key={i} value={a} />
                    ))}
                  </div>
                </td>
                <td className="py-1.5 px-2 text-right font-medium">{sum}</td>
                <td className="py-1.5 pl-2 text-right text-muted-foreground">
                  {runningTotals[i]}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2">
            <td colSpan={2} className="py-2 text-xs text-muted-foreground">
              {bonusLabels
                .map((label, i) =>
                  round.bonus?.[i] != null ? `${round.bonus[i]} ${label}` : null,
                )
                .filter(Boolean)
                .join(' · ')}
            </td>
            <td className="py-2 px-2 text-right text-xs text-muted-foreground">
              Total
            </td>
            <td className="py-2 pl-2 text-right text-base font-bold">
              {round.total}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import {
  archerIdFromParam,
  archerResults,
  loadArcherStore,
  toEventRow,
  type ArcherResult,
  type ArcherStore,
} from '@/lib/betweenends/store';
import { computeEventStats, setupGroups, trendForSetup } from '@/lib/stats';
import { parseDivision, bowStyleLabel } from '@/lib/division';
import { formatDate, formatNumber } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InsightsView } from '@/components/insights-view';
import { ScorecardGrid } from '@/components/scorecard-grid';
import { ArrowDistribution } from '@/components/arrow-distribution';

const BE_SITE = 'https://www.betweenends.com';

export default async function ArcherPage({ params }: { params: Promise<{ id: string }> }) {
  const archerId = archerIdFromParam((await params).id);
  if (!archerId) notFound();
  const store = await loadArcherStore(archerId);
  if (!store || store.entries.length === 0) notFound();

  const results = archerResults(store);
  const latest = results[0].entry;
  const rows = results.filter((r) => r.comparable).map(toEventRow);
  const groups = setupGroups(rows);
  const trends = Object.fromEntries(groups.map((g) => [g.key, trendForSetup(rows, g.key)]));
  const teams = [...new Set(results.map((r) => r.entry.team).filter(Boolean))];
  const divisions = [...new Set(results.map((r) => r.entry.division_code).filter(Boolean))];

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          {latest.first_name} {latest.last_name}
        </h2>
        <p className="text-muted-foreground mt-1">
          {[teams.join(', '), divisions.map(divisionText).join(' · ')].filter(Boolean).join(' — ')}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile label="Tournaments" value={String(Object.keys(store.tournaments).length)} />
        <Tile label="Ranking rounds" value={String(results.length)} />
        <Tile
          label="Best arrow avg"
          value={bestAverage(results)}
          sub="comparable rounds"
        />
        <Tile label="Latest" value={formatDate(results[0].shotOn, true)} sub={results[0].tournament.name} />
      </div>

      {groups.length > 0 ? (
        <InsightsView groups={groups} trends={trends} eventHrefPrefix="#" />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No complete 10-ring rounds with arrows stored yet.
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <h3 className="text-xl font-semibold">Every result</h3>
        {results.map((r) => (
          <ResultCard key={r.key} r={r} />
        ))}
      </section>

      {store.match_rows.length > 0 && <Brackets store={store} />}

      <DataPanel store={store} results={results} />
    </div>
  );
}

function ResultCard({ r }: { r: ArcherResult }) {
  const stats = r.decoded ? computeEventStats(toEventRow(r)) : null;
  const max = r.decoded ? r.decoded.scheduledArrows * 10 : null;
  return (
    <Card id={r.key} className="scroll-mt-20">
      <details>
        <summary className="cursor-pointer list-none p-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            <div className="font-medium">{r.tournament.name}</div>
            <div className="text-xs text-muted-foreground">
              {formatDate(r.shotOn)} · {r.event.name} · {r.entry.division_name ?? r.entry.division_code}
              {r.entry.targets.length > 0 && ` · target ${r.entry.targets.join('/')}`}
            </div>
          </div>
          <div className="text-right tabular-nums">
            {r.decoded ? (
              <>
                <span className="text-lg font-semibold">{r.decoded.total}</span>
                {r.comparable && max ? (
                  <span className="text-muted-foreground text-sm"> / {max}</span>
                ) : null}
                <div className="text-xs text-muted-foreground">
                  {stats && stats.arrowCount > 0 && `avg ${formatNumber(stats.arrowAverage)}`}
                  {r.rank && ` · ${ordinal(r.rank.place)} of ${r.rank.of}`}
                  {!r.decoded.complete && ' · incomplete'}
                  {!r.comparable && r.decoded.complete && ' · not 10-ring'}
                </div>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">arrows not stored</span>
            )}
          </div>
        </summary>
        <CardContent className="space-y-4 border-t pt-4">
          {r.decoded && r.decoded.rounds.some((rd) => rd.ends.length > 0) ? (
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_14rem]">
              {r.decoded.rounds.map((round) => (
                <div key={round.round_number}>
                  <div className="text-sm font-medium mb-1">Round {round.round_number}</div>
                  <ScorecardGrid round={round} bonusLabels={[]} />
                </div>
              ))}
              {stats && <ArrowDistribution distribution={stats.distribution} />}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No arrows stored for this round.</p>
          )}
          <Link
            href={`${BE_SITE}/tournament/${r.tournament.id}/event/${r.event.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
          >
            View on Between Ends <ExternalLink className="h-3 w-3" />
          </Link>
        </CardContent>
      </details>
    </Card>
  );
}

function Brackets({ store }: { store: ArcherStore }) {
  const byEvent = new Map<number, ArcherStore['match_rows']>();
  for (const m of store.match_rows) byEvent.set(m.event_id, [...(byEvent.get(m.event_id) ?? []), m]);
  return (
    <section className="space-y-3">
      <h3 className="text-xl font-semibold">Brackets</h3>
      <Card>
        <CardContent className="pt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground text-left">
                <th className="py-1 font-medium">Tournament</th>
                <th className="py-1 font-medium">Bracket</th>
                <th className="py-1 text-right font-medium">Matches</th>
                <th className="py-1 text-right font-medium">Linked by</th>
              </tr>
            </thead>
            <tbody>
              {[...byEvent].map(([eventId, rows]) => {
                const event = store.events[String(eventId)];
                const t = event && store.tournaments[String(event.tournament_id)];
                return (
                  <tr key={eventId} className="border-t">
                    <td className="py-2 pr-2">
                      {t?.name}
                      <div className="text-xs text-muted-foreground">{formatDate(t?.start_date)}</div>
                    </td>
                    <td className="py-2 pr-2">{[...new Set(rows.map((m) => m.bracket))].join(', ')}</td>
                    <td className="py-2 text-right tabular-nums">{rows.length}</td>
                    <td className="py-2 text-right text-muted-foreground">
                      {[...new Set(rows.map((m) => m.linked_by))].join(', ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">
            Match arrows and results aren&apos;t decoded yet. &ldquo;name&rdquo; means the bracket was linked by name
            within the tournament, not by entry id.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

function DataPanel({ store, results }: { store: ArcherStore; results: ArcherResult[] }) {
  const withArrows = results.filter((r) => r.decoded).length;
  const altVariants = [...new Set(store.entries.map((e) => JSON.stringify(e.alt_raw)))];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">About this data</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-1">
        <p>
          Read from Score Quiver&apos;s own store (built {formatDate(store.built_at.slice(0, 10))}), not live from
          Between Ends.
        </p>
        <p>
          {results.length} ranking entries across {Object.keys(store.tournaments).length} tournaments; arrows
          stored for {withArrows}; {results.filter((r) => r.comparable).length} complete 10-ring rounds in the
          insights.
        </p>
        <p>Membership number as organisers typed it: {altVariants.join(', ')}.</p>
        <p>
          Setups are bow style + indoor/outdoor only. Distance and face aren&apos;t in the results, so U13 and U15
          rounds at different distances can share a chart.
        </p>
      </CardContent>
    </Card>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {sub && <div className="text-xs text-muted-foreground truncate">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function bestAverage(results: ArcherResult[]): string {
  const avgs = results
    .filter((r) => r.comparable)
    .map((r) => computeEventStats(toEventRow(r)).arrowAverage);
  return avgs.length ? formatNumber(Math.max(...avgs)) : '—';
}

function divisionText(code: string): string {
  const d = parseDivision(code);
  return d.bowStyle ? `${bowStyleLabel(d.bowStyle)} ${d.ageClass ?? ''}`.trim() : code;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

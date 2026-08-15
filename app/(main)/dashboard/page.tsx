import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CloudDownload } from 'lucide-react';
import { ensureActiveGymnast } from '@/app/actions/gymnast';
import { BetaBanner } from '@/components/beta-banner';
import { CompetitionActions } from '@/components/competition-actions';
import { DashboardTools } from '@/components/dashboard-tools';
import { ProgressChart } from '@/components/progress-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  apparatusForProgram,
  competitionSeason,
  displayApparatus,
  formatCalendarDate,
} from '@/lib/gymnastics';
import { createClient } from '@/lib/supabase/server';

type ScoreItem = {
  apparatus: string;
  value: number | null;
  place?: number | null;
};

type Competition = {
  id: string;
  gymnast_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  level?: string | null;
  all_around_score: number | null;
  all_around_place?: number | null;
  notes?: string | null;
  scores: ScoreItem[];
};

type PRItem = {
  key: string;
  eventLabel: string;
  score: number;
  place: number | null;
  date: string | null;
  meetName: string;
};

function placeBadgeClass(place?: number | null) {
  if (!place) return 'border border-border bg-muted text-muted-foreground';
  if (place === 1) {
    return 'border border-yellow-500 bg-yellow-100 text-yellow-950 dark:border-yellow-400 dark:bg-yellow-400/20 dark:text-yellow-200';
  }
  if (place === 2) {
    return 'border border-slate-400 bg-slate-100 text-slate-900 dark:border-slate-300 dark:bg-slate-300/20 dark:text-slate-100';
  }
  if (place === 3) {
    return 'border border-orange-700 bg-orange-100 text-orange-950 dark:border-orange-500 dark:bg-orange-600/20 dark:text-orange-200';
  }
  return 'border border-border bg-muted text-muted-foreground';
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start) return 'Date TBD';
  if (end && end !== start) return `${formatCalendarDate(start)} – ${formatCalendarDate(end)}`;
  return formatCalendarDate(start);
}

function getPersonalRecords(competitions: Competition[], eventOrder: string[]) {
  const best = new Map<string, PRItem>();
  const consider = (candidate: PRItem) => {
    const current = best.get(candidate.key);
    if (!current || candidate.score > current.score) best.set(candidate.key, candidate);
  };

  for (const competition of competitions) {
    for (const score of competition.scores ?? []) {
      if (score.value == null) continue;
      consider({
        key: score.apparatus,
        eventLabel: displayApparatus(score.apparatus),
        score: Number(score.value),
        place: score.place ?? null,
        date: competition.start_date,
        meetName: competition.name,
      });
    }
    if (competition.all_around_score != null) {
      consider({
        key: 'all_around',
        eventLabel: 'All Around',
        score: Number(competition.all_around_score),
        place: competition.all_around_place ?? null,
        date: competition.start_date,
        meetName: competition.name,
      });
    }
  }

  const order = [...eventOrder, 'all_around'];
  return Array.from(best.values()).sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; level?: string; print?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const activeGymnastId = await ensureActiveGymnast();
  const [{ data: allCompetitions, error }, { data: gymnast }] = await Promise.all([
    supabase
      .from('competitions_with_scores')
      .select('*')
      .eq('gymnast_id', activeGymnastId)
      .order('start_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false }),
    supabase.from('gymnasts').select('name, gender').eq('id', activeGymnastId).single(),
  ]);

  if (error) return <div className="p-8 text-red-600">Error loading scores.</div>;

  const params = await searchParams;
  const selectedSeason = params.season ?? 'all';
  const selectedLevel = params.level ?? 'all';
  const competitions = (allCompetitions as Competition[] | null) ?? [];
  const seasons = Array.from(
    new Set(competitions.map((competition) => competitionSeason(competition.start_date)))
  ).sort().reverse();
  const levels = Array.from(
    new Set(competitions.map((competition) => competition.level).filter(Boolean) as string[])
  ).sort();
  const filtered = competitions.filter((competition) =>
    (selectedSeason === 'all' || competitionSeason(competition.start_date) === selectedSeason) &&
    (selectedLevel === 'all' || competition.level === selectedLevel)
  );
  const eventOrder = apparatusForProgram(gymnast?.gender);
  const personalRecords = getPersonalRecords(filtered, eventOrder);
  const chronological = [...filtered].reverse();
  const trendSeries = eventOrder.map((apparatus) => ({
    apparatus,
    points: chronological.flatMap((competition) => {
      const score = competition.scores?.find((item) => item.apparatus === apparatus)?.value;
      return score == null
        ? []
        : [{ label: `${formatCalendarDate(competition.start_date)} — ${competition.name}`, score: Number(score) }];
    }),
  }));

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <BetaBanner />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{gymnast?.name || 'Gymnast'}’s Scores</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} meet{filtered.length === 1 ? '' : 's'} shown</p>
        </div>
        <div className="no-print flex gap-2">
          <Button asChild variant="outline">
            <Link href="/import"><CloudDownload className="mr-2 h-4 w-4" />MSO Sync</Link>
          </Button>
          <Button asChild><Link href="/scores/new">Add Meet</Link></Button>
        </div>
      </div>

      <DashboardTools
        seasons={seasons}
        levels={levels}
        selectedSeason={selectedSeason}
        selectedLevel={selectedLevel}
        shouldPrint={params.print === '1'}
      />

      {competitions.length === 0 ? (
        <Card className="text-center py-10">
          <CardHeader><CardTitle>No competitions yet</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">Import from MSO or record the first competition manually.</p>
            <Button asChild><Link href="/import">Import from MSO</Link></Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="py-10 text-center"><CardContent>No meets match these filters.</CardContent></Card>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle>Personal Records</CardTitle></CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {personalRecords.map((record) => (
                <div key={record.key} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{record.eventLabel}</p>
                    <p className="text-xs text-muted-foreground">{record.meetName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{record.score.toFixed(3)}</p>
                    {record.place ? <span className={`rounded-full px-2 py-0.5 text-xs ${placeBadgeClass(record.place)}`}>#{record.place}</span> : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {trendSeries.some((series) => series.points.length > 1) && (
            <Card>
              <CardHeader><CardTitle>Progress</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {trendSeries.map((series) => (
                  <ProgressChart key={series.apparatus} label={displayApparatus(series.apparatus)} points={series.points} />
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-5">
            {filtered.map((competition) => (
              <Card key={competition.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                  <div>
                    <CardTitle className="text-xl">{competition.name}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDateRange(competition.start_date, competition.end_date)}
                      {competition.level ? <span className="ml-2 rounded-full bg-secondary/10 px-2 py-0.5 text-xs text-secondary">{competition.level}</span> : null}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-right">
                      <p className="text-xs uppercase text-muted-foreground">All Around</p>
                      <div className="flex items-center justify-end gap-2">
                        <p className="text-2xl font-bold text-primary">
                          {competition.all_around_score == null ? '—' : Number(competition.all_around_score).toFixed(3)}
                        </p>
                        {competition.all_around_place ? <span className={`rounded-full px-2 py-0.5 text-xs ${placeBadgeClass(competition.all_around_place)}`}>#{competition.all_around_place}</span> : null}
                      </div>
                    </div>
                    <div className="no-print"><CompetitionActions id={competition.id} name={competition.name} /></div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {eventOrder.map((apparatus) => {
                      const score = competition.scores?.find((item) => item.apparatus === apparatus);
                      if (!score) return null;
                      return (
                        <div key={apparatus}>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium uppercase text-muted-foreground">{displayApparatus(apparatus)}</p>
                            {score.place ? <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${placeBadgeClass(score.place)}`}>#{score.place}</span> : null}
                          </div>
                          <p className="text-lg font-semibold">{score.value == null ? '—' : Number(score.value).toFixed(3)}</p>
                        </div>
                      );
                    })}
                  </div>
                  {competition.notes ? <p className="mt-4 border-t pt-3 text-sm text-muted-foreground">{competition.notes}</p> : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

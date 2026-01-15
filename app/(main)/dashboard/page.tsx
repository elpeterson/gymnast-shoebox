import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompetitionActions } from '@/components/competition-actions';
import { BetaBanner } from '@/components/beta-banner';
import { ensureActiveGymnast } from '@/app/actions/gymnast';
import { CloudDownload } from 'lucide-react';

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
  level?: string;
  all_around_score: number | null;
  all_around_place?: number | null;
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

/* ------------------------------
   Display helpers
-------------------------------- */

function displayApparatus(app: string) {
  switch (app) {
    case 'floor_exercise':
      return 'Floor';
    case 'balance_beam':
      return 'Beam';
    case 'uneven_bars':
      return 'Bars';
    case 'vault':
      return 'Vault';
    case 'parallel_bars':
      return 'P Bars';
    case 'still_rings':
      return 'Rings';
    case 'pommel_horse':
      return 'Pommel';
    case 'high_bar':
      return 'High Bar';
    default:
      return app.replace('_', ' ');
  }
}

function placeBadgeClass(place?: number | null) {
  if (!place) return 'bg-muted text-muted-foreground';
  if (place === 1) return 'bg-yellow-500/20 text-yellow-500';
  if (place === 2) return 'bg-gray-400/20 text-gray-300';
  if (place === 3) return 'bg-amber-700/20 text-amber-400';
  return 'bg-muted text-muted-foreground';
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start) return null;

  const startStr = new Date(start).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (end && end !== start) {
    const endStr = new Date(end).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${startStr} - ${endStr}`;
  }

  return startStr;
}

function formatSingleDate(date: string | null) {
  if (!date) return 'Date TBD';
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getPrimaryDate(comp: Competition): string | null {
  return comp.start_date ?? comp.end_date ?? null;
}

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const activeGymnastId = await ensureActiveGymnast();

  const { data: competitions, error } = await supabase
    .from('competitions_with_scores')
    .select('*')
    .eq('gymnast_id', activeGymnastId)
    .order('start_date', { ascending: false, nullsFirst: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching competitions:', error);
    return <div className="p-8 text-red-500">Error loading scores.</div>;
  }

  const hasCompetitions = competitions && competitions.length > 0;

  // Build PRs from the fetched competitions
  const personalRecords: PRItem[] = (() => {
    if (!hasCompetitions) return [];

    const best = new Map<string, PRItem>();

    const dateToSort = (d: string | null) => {
      if (!d) return Number.POSITIVE_INFINITY;
      const t = new Date(d).getTime();
      return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
    };

    const shouldReplace = (cur: PRItem | undefined, cand: PRItem) => {
      if (!cur) return true;

      if (cand.score > cur.score) return true;
      if (cand.score < cur.score) return false;

      // tie on score -> earliest date wins
      const ct = dateToSort(cur.date);
      const nt = dateToSort(cand.date);
      if (nt < ct) return true;
      if (nt > ct) return false;

      // still tied -> better (lower) place wins if both exist
      if (cand.place !== null && cur.place === null) return true;
      if (cand.place === null && cur.place !== null) return false;
      if (cand.place !== null && cur.place !== null && cand.place < cur.place)
        return true;

      return false;
    };

    for (const comp of competitions as Competition[]) {
      const meetName = comp.name;
      const date = getPrimaryDate(comp);

      // event PRs
      for (const s of comp.scores ?? []) {
        if (s.value === null || s.value === undefined) continue;

        const key = s.apparatus;
        const cand: PRItem = {
          key,
          eventLabel: displayApparatus(s.apparatus),
          score: s.value,
          place: s.place ?? null,
          date,
          meetName,
        };

        const cur = best.get(key);
        if (shouldReplace(cur, cand)) best.set(key, cand);
      }

      // all around PR
      if (comp.all_around_score !== null && comp.all_around_score !== undefined) {
        const key = 'all_around';
        const cand: PRItem = {
          key,
          eventLabel: 'All Around',
          score: comp.all_around_score,
          place: comp.all_around_place ?? null,
          date,
          meetName,
        };

        const cur = best.get(key);
        if (shouldReplace(cur, cand)) best.set(key, cand);
      }
    }

    const preferredOrder = [
      'vault',
      'uneven_bars',
      'balance_beam',
      'floor_exercise',
      'all_around',
    ];

    const prs = Array.from(best.values());
    prs.sort((a, b) => {
      const ai = preferredOrder.indexOf(a.key);
      const bi = preferredOrder.indexOf(b.key);
      const ar = ai === -1 ? 999 : ai;
      const br = bi === -1 ? 999 : bi;
      if (ar !== br) return ar - br;
      return a.eventLabel.localeCompare(b.eventLabel);
    });

    return prs;
  })();

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <BetaBanner />

      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Score History</h2>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/import">
              <CloudDownload className="mr-2 h-4 w-4" />
              Import
            </Link>
          </Button>
          <Button asChild>
            <Link href="/scores/new">Add Score</Link>
          </Button>
        </div>
      </div>

      {!hasCompetitions ? (
        <Card className="text-center py-10">
          <CardHeader>
            <CardTitle>No competitions yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Get started by recording your first competition result.
            </p>
            <Button asChild>
              <Link href="/scores/new">Add Your First Score</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {/* Personal Records */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-bold">Personal Records</CardTitle>
            </CardHeader>
            <CardContent>
              {personalRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No PRs yet. Add meet scores to start tracking personal bests.
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="hidden sm:grid sm:grid-cols-12 text-xs uppercase text-muted-foreground px-2">
                    <div className="col-span-3">Event</div>
                    <div className="col-span-2">Score</div>
                    <div className="col-span-2">Place</div>
                    <div className="col-span-2">Date</div>
                    <div className="col-span-3">Meet</div>
                  </div>

                  {personalRecords.map((pr) => {
                    const hasPlace = pr.place !== null && pr.place !== undefined;

                    return (
                      <div
                        key={pr.key}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center rounded-lg border border-border/60 px-3 py-2"
                      >
                        <div className="sm:col-span-3">
                          <span className="text-sm font-medium">{pr.eventLabel}</span>
                        </div>

                        <div className="sm:col-span-2">
                          <span className="text-sm font-semibold">
                            {pr.score.toFixed(3)}
                          </span>
                        </div>

                        <div className="sm:col-span-2">
                          {hasPlace ? (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${placeBadgeClass(
                                pr.place
                              )}`}
                              title="Place"
                            >
                              #{pr.place}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </div>

                        <div className="sm:col-span-2">
                          <span className="text-sm text-muted-foreground">
                            {formatSingleDate(pr.date)}
                          </span>
                        </div>

                        <div className="sm:col-span-3">
                          <span className="text-sm">{pr.meetName}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Competitions */}
          {(competitions as Competition[]).map((comp: Competition) => (
            <Card key={comp.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-xl font-bold">{comp.name}</CardTitle>

                  <p className="text-sm text-muted-foreground mt-1">
                    {comp.start_date ? (
                      <>{formatDateRange(comp.start_date, comp.end_date)}</>
                    ) : (
                      <span className="italic">Date TBD</span>
                    )}

                    {comp.level && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary ring-1 ring-inset ring-secondary/20">
                        {comp.level}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <CompetitionActions id={comp.id} name={comp.name} />

                  <div className="text-right">
                    <p className="text-xs uppercase text-muted-foreground">
                      All Around
                    </p>
                    <div className="flex items-center gap-2 justify-end">
                      <p className="text-2xl font-bold text-primary">
                        {comp.all_around_score !== null
                          ? comp.all_around_score.toFixed(3)
                          : '0.000'}
                      </p>

                      {comp.all_around_place && (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${placeBadgeClass(
                            comp.all_around_place
                          )}`}
                          title="All-Around Place"
                        >
                          #{comp.all_around_place}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
                  {comp.scores?.map((score, index) => {
                    const hasPlace =
                      score.place !== null && score.place !== undefined;

                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium text-muted-foreground uppercase">
                            {displayApparatus(score.apparatus)}
                          </p>

                          {hasPlace && (
                            <span
                              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${placeBadgeClass(
                                score.place
                              )}`}
                              title="Event place"
                            >
                              #{score.place}
                            </span>
                          )}
                        </div>

                        <p className="text-lg font-semibold">
                          {score.value !== null ? score.value.toFixed(3) : '-'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

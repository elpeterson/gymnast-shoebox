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

const APPARATUS_ORDER = [
  // Women's (what you actually care about)
  'vault',
  'uneven_bars',
  'balance_beam',
  'floor_exercise',

  // Men's (supported by the DB, might exist in data)
  'pommel_horse',
  'still_rings',
  'parallel_bars',
  'high_bar',
] as const;

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
    case 'pommel_horse':
      return 'Pommel';
    case 'still_rings':
      return 'Rings';
    case 'parallel_bars':
      return 'P Bars';
    case 'high_bar':
      return 'High Bar';
    default:
      return app.replaceAll('_', ' ');
  }
}

function placeBadgeClass(place: number) {
  // Tailwind-ish classes (no custom colors requested; using semantic-ish defaults)
  // 1/2/3 get “medal” treatment; others stay muted.
  if (place === 1) return 'bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/25';
  if (place === 2) return 'bg-slate-500/15 text-slate-200 ring-1 ring-slate-500/25';
  if (place === 3) return 'bg-amber-600/15 text-amber-200 ring-1 ring-amber-600/25';
  return 'bg-muted/40 text-muted-foreground ring-1 ring-inset ring-muted/40';
}

function sortScores(scores: ScoreItem[] | undefined) {
  const safe = scores ?? [];
  const rank = new Map<string, number>();
  APPARATUS_ORDER.forEach((a, i) => rank.set(a, i));

  return [...safe].sort((a, b) => {
    const ra = rank.has(a.apparatus) ? (rank.get(a.apparatus) as number) : 999;
    const rb = rank.has(b.apparatus) ? (rank.get(b.apparatus) as number) : 999;

    if (ra !== rb) return ra - rb;
    return a.apparatus.localeCompare(b.apparatus);
  });
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
          {competitions.map((comp: Competition) => {
            const sortedScores = sortScores(comp.scores);

            return (
              <Card key={comp.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-xl font-bold">{comp.name}</CardTitle>

                    <p className="text-sm text-muted-foreground mt-1">
                      {!comp.start_date ? (
                        <span className="italic">Date TBD</span>
                      ) : (
                        <>
                          {new Date(comp.start_date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                          {comp.end_date && comp.end_date !== comp.start_date && (
                            <>
                              {' '}
                              –{' '}
                              {new Date(comp.end_date).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </>
                          )}
                        </>
                      )}

                      {comp.level && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary ring-1 ring-inset ring-secondary/20">
                          {comp.level}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="text-right flex flex-col items-end gap-2">
                    <CompetitionActions id={comp.id} name={comp.name} />

                    <div className="text-right">
                      <p className="text-sm font-medium text-muted-foreground uppercase">
                        All Around
                      </p>

                      <div className="flex items-baseline gap-2 justify-end">
                        <p className="text-2xl font-bold text-primary">
                          {comp.all_around_score !== null
                            ? comp.all_around_score.toFixed(3)
                            : '0.000'}
                        </p>

                        {comp.all_around_place !== null &&
                          comp.all_around_place !== undefined && (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${placeBadgeClass(
                                comp.all_around_place
                              )}`}
                              title="All Around Place"
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
                    {sortedScores.map((score, index) => {
                      const hasPlace =
                        score.place !== null && score.place !== undefined;

                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase">
                              {displayApparatus(score.apparatus)}
                            </p>

                            {hasPlace && (
                              <span
                                className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${placeBadgeClass(
                                  score.place as number
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
            );
          })}
        </div>
      )}
    </div>
  );
}

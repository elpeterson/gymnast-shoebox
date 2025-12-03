import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompetitionActions } from '@/components/competition-actions';
import { BetaBanner } from '@/components/beta-banner';
import { ensureActiveGymnast } from '@/app/actions/gymnast';

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

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const activeGymnastId = await ensureActiveGymnast();

  const { data: competitions, error } = await supabase
    .from('competitions_with_scores')
    .select('*')
    .eq('gymnast_id', activeGymnastId)
    .order('start_date', { ascending: false, nullsFirst: true }) // TODO: maybe make dates required if this is a problem
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
        <Button asChild>
          <Link href="/scores/new">Add Score</Link>
        </Button>
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
          {competitions.map((comp: Competition) => (
            <Card key={comp.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-xl font-bold">
                    {comp.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {!comp.start_date ? (
                      <span className="italic">Date TBD</span>
                    ) : (
                      <>
                        {new Date(comp.start_date).toLocaleDateString(
                          undefined,
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }
                        )}
                        {comp.end_date && comp.end_date !== comp.start_date && (
                          <>
                            {' '}
                            –{' '}
                            {new Date(comp.end_date).toLocaleDateString(
                              undefined,
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              }
                            )}
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
                  <div>
                    <p className="text-sm font-medium text-muted-foreground uppercase">
                      All Around
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      {comp.all_around_score !== null
                        ? comp.all_around_score.toFixed(3)
                        : '0.000'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
                  {comp.scores?.map((score, index) => (
                    <div key={index} className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase truncate">
                        {score.apparatus.replace('_', ' ')}
                        {score.place && (
                          <span className="ml-1 text-[10px] text-muted-foreground/70">
                            ({score.place})
                          </span>
                        )}
                      </p>
                      <p className="text-lg font-semibold">
                        {score.value !== null ? score.value.toFixed(3) : '-'}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

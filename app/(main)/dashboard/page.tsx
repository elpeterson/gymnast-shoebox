import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompetitionActions } from '@/components/competition-actions';
import { BetaBanner } from '@/components/beta-banner';
import { ensureActiveGymnast } from '@/app/actions/gymnast';
import { CloudDownload } from 'lucide-react';
import { MAG_APPARATUS, WAG_APPARATUS } from '@/lib/constants';

type ScoreItem = {
  apparatus: string;
  value: number | null;
  place?: number | null;
  start_value?: number | null;
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

  const { data: gymnast } = await supabase
    .from('gymnasts')
    .select('discipline')
    .eq('id', activeGymnastId)
    .single();

  const discipline = gymnast?.discipline || 'MAG';
  const apparatusConfig = discipline === 'WAG' ? WAG_APPARATUS : MAG_APPARATUS;

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
            <div className="flex justify-center gap-3">
              <Button asChild variant="outline">
                <Link href="/import">
                  <CloudDownload className="mr-2 h-4 w-4" />
                  Import from MSO
                </Link>
              </Button>
              <Button asChild>
                <Link href="/scores/new">Add Your First Score</Link>
              </Button>
            </div>
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
                    <div className="flex items-baseline justify-end gap-2">
                      <p className="text-2xl font-bold text-primary">
                        {comp.all_around_score !== null
                          ? comp.all_around_score.toFixed(3)
                          : '0.000'}
                      </p>
                      {comp.all_around_place && (
                        <span className="text-sm font-semibold text-muted-foreground">
                          ({comp.all_around_place})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
                  {apparatusConfig.map((appConfig) => {
                    const score = comp.scores.find(
                      (s) => s.apparatus === appConfig.id
                    );

                    return (
                      <div key={appConfig.id} className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase truncate">
                          {appConfig.label}
                          {score?.place && (
                            <span className="ml-1 text-[10px] text-muted-foreground/70">
                              ({score.place})
                            </span>
                          )}
                        </p>
                        <div className="flex items-baseline gap-2">
                          {score?.start_value && (
                            <span
                              className="text-xs text-muted-foreground/60"
                              title="Start Value"
                            >
                              SV:{score.start_value.toFixed(1)}
                            </span>
                          )}
                          <p className="text-lg font-semibold">
                            {score?.value !== null && score?.value !== undefined
                              ? score.value.toFixed(3)
                              : '-'}
                          </p>
                        </div>
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
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ScoreItem = {
  apparatus: string;
  value: number;
};

type Competition = {
  id: string;
  name: string;
  competition_date: string;
  all_around_score: number;
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

  const { data: competitions, error } = await supabase
    .from('competitions_with_scores')
    .select('*')
    .order('competition_date', { ascending: false });

  if (error) {
    console.error('Error fetching competitions:', error);
    return <div className="p-8 text-red-500">Error loading scores.</div>;
  }

  const hasCompetitions = competitions && competitions.length > 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
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
                  <p className="text-sm text-muted-foreground">
                    {new Date(comp.competition_date).toLocaleDateString(
                      undefined,
                      {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-muted-foreground uppercase">
                    All Around
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {comp.all_around_score?.toFixed(3) || '0.000'}
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
                  {comp.scores?.map((score, index) => (
                    <div key={index} className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase truncate">
                        {score.apparatus.replace('_', ' ')}
                      </p>
                      <p className="text-lg font-semibold">
                        {score.value.toFixed(3)}
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

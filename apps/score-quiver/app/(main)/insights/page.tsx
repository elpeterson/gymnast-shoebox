import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ensureActiveArcher } from '@/app/actions/archer';
import { fetchArcherEvents } from '@/lib/events';
import { setupGroups, trendForSetup } from '@/lib/stats';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { InsightsView } from '@/components/insights-view';

export default async function InsightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const activeArcherId = await ensureActiveArcher();
  if (!activeArcherId) redirect('/dashboard');

  const { events, error } = await fetchArcherEvents(supabase, activeArcherId);
  if (error) {
    return <div className="p-8 text-red-500">Error loading scorecards.</div>;
  }

  const groups = setupGroups(events);
  const trends = Object.fromEntries(
    groups.map((g) => [g.key, trendForSetup(events, g.key)]),
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Insights</h2>
        <p className="text-muted-foreground mt-1">
          Scores are only compared within one setup: the same bow, indoor or
          outdoor, distance and face.
        </p>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-muted-foreground">
              Import a few scorecards to see trends.
            </p>
            <Button asChild>
              <Link href="/import">Import scorecards</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <InsightsView groups={groups} trends={trends} />
      )}
    </div>
  );
}

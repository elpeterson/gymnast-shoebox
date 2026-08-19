import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { ensureActiveGymnast } from '@/app/actions/gymnast';
import { ConsistencyInsights } from '@/components/consistency-insights';
import type { CompetitionRow } from '@/lib/insights';

// The whole season feeds the chart, so this page is not paginated. The cap is a
// defensive bound; no real gymnast approaches it.
const MAX_COMPETITIONS = 500;

export default async function InsightsPage() {
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
    .select('name, discipline')
    .eq('id', activeGymnastId)
    .single();

  // Read division from the base table + embedded scores, so the feature does
  // not depend on the `competitions_with_scores` view exposing `division`.
  const { data: competitions, error } = await supabase
    .from('competitions')
    .select('id, name, start_date, division, scores(apparatus, value)')
    .eq('gymnast_id', activeGymnastId)
    .order('start_date', { ascending: true, nullsFirst: false })
    .limit(MAX_COMPETITIONS);

  if (error) {
    return (
      <div className="p-8 text-red-500">Error loading consistency data.</div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Consistency</h2>
          <p className="text-sm text-muted-foreground">
            {gymnast?.name ?? 'This gymnast'}&rsquo;s scores across the season,
            by division.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Scores
          </Link>
        </Button>
      </div>

      <ConsistencyInsights
        competitions={(competitions as CompetitionRow[]) ?? []}
        discipline={gymnast?.discipline ?? 'MAG'}
      />
    </div>
  );
}

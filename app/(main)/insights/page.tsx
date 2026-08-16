import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { ensureActiveGymnast } from '@/app/actions/gymnast';
import { ConsistencyView } from '@/components/consistency-view';
import type { CompetitionWithScores } from '@/lib/consistency';

// The whole score history feeds the statistics, so this page is not paginated.
// The cap is a defensive bound; no real gymnast approaches it.
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

  const { data: competitions, error } = await supabase
    .from('competitions_with_scores')
    .select('id, name, start_date, scores')
    .eq('gymnast_id', activeGymnastId)
    .order('start_date', { ascending: true, nullsFirst: false })
    .limit(MAX_COMPETITIONS);

  if (error) {
    return (
      <div className="p-8 text-red-500">Error loading consistency data.</div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Consistency</h2>
          <p className="text-sm text-muted-foreground">
            How steady {gymnast?.name ?? 'this gymnast'} is on each apparatus,
            across every recorded meet.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Scores
          </Link>
        </Button>
      </div>

      <ConsistencyView
        competitions={(competitions as CompetitionWithScores[]) ?? []}
        discipline={gymnast?.discipline ?? 'MAG'}
      />
    </div>
  );
}

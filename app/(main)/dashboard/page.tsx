import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BetaBanner } from '@/components/beta-banner';
import { ensureActiveGymnast } from '@/app/actions/gymnast';
import { CloudDownload } from 'lucide-react';
import { CompetitionList } from '@/components/competition-list';

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

      <CompetitionList
        competitions={competitions || []}
        discipline={gymnast?.discipline || 'MAG'}
      />
    </div>
  );
}

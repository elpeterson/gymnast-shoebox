import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ensureActiveGymnast } from '@/app/actions/gymnast';
import { CompetitionForm } from '@/components/competition-form';

export default async function AddScorePage() {
  const supabase = await createClient();
  const gymnastId = await ensureActiveGymnast();

  if (!gymnastId) redirect('/dashboard');

  const { data: gymnast } = await supabase
    .from('gymnasts')
    .select('discipline')
    .eq('id', gymnastId)
    .single();

  return (
    <div className="max-w-2xl mx-auto py-10">
      <CompetitionForm discipline={gymnast?.discipline || 'MAG'} />
    </div>
  );
}

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CompetitionForm } from '@/components/competition-form';

export default async function EditCompetitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: competition, error } = await supabase
    .from('competitions_with_scores')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !competition) {
    redirect('/dashboard');
  }

  // `division` may not be exposed by the view yet; read it from the base table
  // so the edit form prefills it and does not blank it out on save.
  const { data: base } = await supabase
    .from('competitions')
    .select('division')
    .eq('id', id)
    .single();

  const initialData = {
    ...competition,
    division: competition.division ?? base?.division ?? null,
  };

  const { data: gymnast } = await supabase
    .from('gymnasts')
    .select('discipline')
    .eq('id', competition.gymnast_id)
    .single();

  return (
    <div className="max-w-2xl mx-auto py-10">
      <CompetitionForm
        initialData={initialData}
        discipline={gymnast?.discipline || 'MAG'}
      />
    </div>
  );
}

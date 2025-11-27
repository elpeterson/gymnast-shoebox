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

  return (
    <div className="max-w-2xl mx-auto py-10">
      <CompetitionForm initialData={competition} />
    </div>
  );
}

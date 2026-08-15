import { CompetitionForm } from '@/components/competition-form';
import { ensureActiveGymnast } from '@/app/actions/gymnast';
import { createClient } from '@/lib/supabase/server';

export default async function AddScorePage() {
  const supabase = await createClient();
  const gymnastId = await ensureActiveGymnast();
  const { data: gymnast } = gymnastId
    ? await supabase.from('gymnasts').select('gender').eq('id', gymnastId).single()
    : { data: null };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <CompetitionForm gymnastProgram={gymnast?.gender === 'male' ? 'male' : 'female'} />
    </div>
  );
}

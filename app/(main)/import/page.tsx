import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ensureActiveGymnast } from '@/app/actions/gymnast';
import { ImportView } from '@/components/import-view';

export default async function ImportPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const activeGymnastId = await ensureActiveGymnast();
  if (!activeGymnastId) redirect('/dashboard');

  const { data: gymnast } = await supabase
    .from('gymnasts')
    .select('mso_id')
    .eq('id', activeGymnastId)
    .single();

  return <ImportView initialMsoId={gymnast?.mso_id} />;
}

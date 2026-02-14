'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ensureActiveGymnast } from '@/app/actions/gymnast';
import { MAG_APPARATUS, WAG_APPARATUS } from '@/lib/constants';

export async function createScore(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const gymnastId = await ensureActiveGymnast();
  if (!gymnastId) {
    return { error: 'No gymnast profile found. Please create one first.' };
  }

  const name = formData.get('name') as string;
  const level = formData.get('level') as string | null;
  const discipline = formData.get('discipline') as string;

  const rawAAPlace = formData.get('all_around_place');
  const allAroundPlace = rawAAPlace ? parseInt(rawAAPlace.toString()) : null;

  const rawStartDate = formData.get('start_date') as string;
  const rawEndDate = formData.get('end_date') as string;
  const startDate = rawStartDate ? rawStartDate : null;
  const endDate = rawEndDate ? rawEndDate : null;

  const apparatusList =
    discipline === 'WAG'
      ? WAG_APPARATUS.map((a) => a.id)
      : MAG_APPARATUS.map((a) => a.id);

  const { data: competition, error: compError } = await supabase
    .from('competitions')
    .insert({
      user_id: user.id,
      gymnast_id: gymnastId,
      name: name,
      start_date: startDate,
      end_date: endDate,
      level: level,
      all_around_place: allAroundPlace,
    })
    .select()
    .single();

  if (compError) {
    console.error('Error creating competition:', compError);
    return { error: 'Failed to create competition record.' };
  }

  const scoreInserts = apparatusList.map((app) => {
    const rawValue = formData.get(app);
    const rawPlace = formData.get(`${app}_place`);
    const rawStartValue = formData.get(`${app}_sv`);

    return {
      competition_id: competition.id,
      apparatus: app,
      value: rawValue ? parseFloat(rawValue.toString()) : null,
      place: rawPlace ? parseInt(rawPlace.toString()) : null,
      start_value: rawStartValue ? parseFloat(rawStartValue.toString()) : null,
    };
  });

  const { error: scoreError } = await supabase
    .from('scores')
    .insert(scoreInserts);

  if (scoreError) {
    console.error('Error saving scores:', scoreError);
    return { error: 'Failed to save apparatus scores.' };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteCompetition(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from('competitions').delete().eq('id', id);

  if (error) {
    return { error: 'Failed to delete competition.' };
  }

  revalidatePath('/dashboard');
}

export async function updateCompetition(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const name = formData.get('name') as string;
  const level = formData.get('level') as string | null;
  const discipline = formData.get('discipline') as string;

  const rawAAPlace = formData.get('all_around_place');
  const allAroundPlace = rawAAPlace ? parseInt(rawAAPlace.toString()) : null;

  const rawStartDate = formData.get('start_date') as string;
  const rawEndDate = formData.get('end_date') as string;
  const startDate = rawStartDate ? rawStartDate : null;
  const endDate = rawEndDate ? rawEndDate : null;

  const { error: compError } = await supabase
    .from('competitions')
    .update({
      name,
      start_date: startDate,
      end_date: endDate,
      level,
      all_around_place: allAroundPlace,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (compError) return { error: 'Failed to update competition details.' };

  const apparatusList =
    discipline === 'WAG'
      ? WAG_APPARATUS.map((a) => a.id)
      : MAG_APPARATUS.map((a) => a.id);

  for (const app of apparatusList) {
    const rawValue = formData.get(app);
    const rawPlace = formData.get(`${app}_place`);
    const rawStartValue = formData.get(`${app}_sv`);

    const value = rawValue ? parseFloat(rawValue.toString()) : null;
    const place = rawPlace ? parseInt(rawPlace.toString()) : null;
    const startValue = rawStartValue
      ? parseFloat(rawStartValue.toString())
      : null;

    const { error } = await supabase.from('scores').upsert(
      {
        competition_id: id,
        apparatus: app,
        value,
        place,
        start_value: startValue,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'competition_id, apparatus' }
    );

    if (error) console.error('Error updating score', error);
  }

  revalidatePath('/dashboard');
  return { success: true };
}

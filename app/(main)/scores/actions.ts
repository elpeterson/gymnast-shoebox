'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ensureActiveGymnast } from '@/app/actions/gymnast';

const APPARATUSES = [
  'floor_exercise',
  'vault',
  'uneven_bars',
  'balance_beam',
  'pommel_horse',
  'still_rings',
  'parallel_bars',
  'high_bar',
];

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

  const rawStartDate = formData.get('start_date') as string;
  const rawEndDate = formData.get('end_date') as string;

  const startDate = rawStartDate || null;
  const endDate = rawEndDate || null;

  const { data: competition, error: compError } = await supabase
    .from('competitions')
    .insert({
      user_id: user.id,
      gymnast_id: gymnastId,
      name,
      start_date: startDate,
      end_date: endDate,
      level,
    })
    .select()
    .single();

  if (compError) {
    console.error('Error creating competition:', compError);
    return { error: 'Failed to create competition record.' };
  }

  const scoreInserts = APPARATUSES
    .map((app) => {
      const rawValue = formData.get(app);
      const rawPlace = formData.get(`${app}_place`);
      const rawSV = formData.get(`${app}_sv`);

      const valueStr = rawValue?.toString().trim() ?? '';
      const placeStr = rawPlace?.toString().trim() ?? '';
      const svStr = rawSV?.toString().trim() ?? '';

      // Skip empty apparatus
      if (!valueStr && !placeStr && !svStr) return null;

      return {
        competition_id: competition.id,
        apparatus: app,
        value: valueStr ? parseFloat(valueStr) : null,
        place: placeStr ? parseInt(placeStr) : null,
        start_value: svStr ? parseFloat(svStr) : null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (scoreInserts.length > 0) {
    const { error: scoreError } = await supabase
      .from('scores')
      .insert(scoreInserts);

    if (scoreError) {
      console.error('Error saving scores:', scoreError);
      return { error: 'Failed to save apparatus scores.' };
    }
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteCompetition(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('competitions')
    .delete()
    .eq('id', id);

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

  const rawStartDate = formData.get('start_date') as string;
  const rawEndDate = formData.get('end_date') as string;

  const startDate = rawStartDate || null;
  const endDate = rawEndDate || null;

  const { error: compError } = await supabase
    .from('competitions')
    .update({
      name,
      start_date: startDate,
      end_date: endDate,
      level,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (compError) {
    console.error('Error updating competition:', compError);
    return { error: 'Failed to update competition details.' };
  }

  for (const app of APPARATUSES) {
    const rawValue = formData.get(app);
    const rawPlace = formData.get(`${app}_place`);
    const rawSV = formData.get(`${app}_sv`);

    const value = rawValue ? parseFloat(rawValue.toString()) : null;
    const place = rawPlace ? parseInt(rawPlace.toString()) : null;
    const startValue = rawSV ? parseFloat(rawSV.toString()) : null;

    // Skip empty apparatus
    if (value === null && place === null && startValue === null) continue;

    const { error: upsertError } = await supabase
      .from('scores')
      .upsert(
        {
          competition_id: id,
          apparatus: app,
          value,
          place,
          start_value: startValue,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'competition_id,apparatus' }
      );

    if (upsertError) {
      console.error('Error upserting score:', upsertError);
      return { error: `Failed to update score for ${app}.` };
    }
  }

  revalidatePath('/dashboard');
  return { success: true };
}

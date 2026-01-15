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
  const startDate = (formData.get('start_date') as string) || null;
  const endDate = (formData.get('end_date') as string) || null;

  const rawAAPlace = formData.get('all_around_place');
  const allAroundPlace = rawAAPlace ? Number.parseInt(rawAAPlace.toString(), 10) : null;

  const { data: competition, error: compError } = await supabase
    .from('competitions')
    .insert({
      user_id: user.id,
      gymnast_id: gymnastId,
      name,
      start_date: startDate,
      end_date: endDate,
      level,
      all_around_place: allAroundPlace,
    })
    .select()
    .single();

  if (compError) {
    console.error(compError);
    return { error: 'Failed to create competition.' };
  }

  const scoreInserts = APPARATUSES.map((app) => {
    const valueStr = formData.get(app)?.toString().trim() ?? '';
    const placeStr = formData.get(`${app}_place`)?.toString().trim() ?? '';
    const svStr = formData.get(`${app}_sv`)?.toString().trim() ?? '';

    if (!valueStr && !placeStr && !svStr) return null;

    return {
      competition_id: competition.id,
      apparatus: app,
      value: valueStr ? Number(valueStr) : null,
      place: placeStr ? Number.parseInt(placeStr, 10) : null,
      start_value: svStr ? Number(svStr) : null,
    };
  }).filter(Boolean);

  if (scoreInserts.length) {
    const { error } = await supabase.from('scores').insert(scoreInserts);
    if (error) {
      console.error(error);
      return { error: error.message };
    }
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateCompetition(id: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const name = formData.get('name') as string;
  const level = formData.get('level') as string | null;
  const startDate = (formData.get('start_date') as string) || null;
  const endDate = (formData.get('end_date') as string) || null;

  const rawAAPlace = formData.get('all_around_place');
  const allAroundPlace = rawAAPlace ? Number.parseInt(rawAAPlace.toString(), 10) : null;

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

  if (compError) {
    console.error(compError);
    return { error: compError.message };
  }

  for (const app of APPARATUSES) {
    const valueStr = formData.get(app)?.toString().trim() ?? '';
    const placeStr = formData.get(`${app}_place`)?.toString().trim() ?? '';
    const svStr = formData.get(`${app}_sv`)?.toString().trim() ?? '';

    if (!valueStr && !placeStr && !svStr) continue;

    const value = valueStr ? Number(valueStr) : null;
    const place = placeStr ? Number.parseInt(placeStr, 10) : null;
    const startValue = svStr ? Number(svStr) : null;

    if (value !== null && Number.isNaN(value)) {
      return { error: `Invalid score for ${app}` };
    }

    const { error } = await supabase
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

    if (error) {
      console.error(error);
      return { error: `Failed to update ${app}: ${error.message}` };
    }
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteCompetition(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from('competitions').delete().eq('id', id);

  if (error) {
    console.error(error);
    return { error: error.message };
  }

  revalidatePath('/dashboard');
}

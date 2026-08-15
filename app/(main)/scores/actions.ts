'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';
import { ensureActiveGymnast } from '@/app/actions/gymnast';
import { parseCompetitionForm } from '@/lib/competition-input';
import { createClient } from '@/lib/supabase/server';

function messageFor(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? 'Please check the competition details.';
  }
  return error instanceof Error ? error.message : 'Unable to save the competition.';
}

async function saveCompetition(id: string | null, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const gymnastId = await ensureActiveGymnast();
  if (!gymnastId) return { error: 'Create a gymnast profile first.' };

  try {
    const input = parseCompetitionForm(formData);
    const { error } = await supabase.rpc('save_competition', {
      p_competition_id: id,
      p_gymnast_id: gymnastId,
      p_name: input.name,
      p_level: input.level,
      p_start_date: input.startDate,
      p_end_date: input.endDate,
      p_all_around_place: input.allAroundPlace,
      p_notes: input.notes,
      p_mso_meet_id: null,
      p_scores: input.scores.map((score) => ({
        apparatus: score.apparatus,
        value: score.value,
        place: score.place,
        start_value: score.startValue,
      })),
    });

    if (error) {
      console.error('Competition save failed:', error);
      return { error: error.message };
    }
  } catch (error) {
    return { error: messageFor(error) };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function createScore(formData: FormData) {
  return saveCompetition(null, formData);
}

export async function updateCompetition(id: string, formData: FormData) {
  return saveCompetition(id, formData);
}

export async function deleteCompetition(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase
    .from('competitions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  return { success: true };
}

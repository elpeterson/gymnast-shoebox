'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function createScore(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const name = formData.get('name') as string;
  const date = formData.get('date') as string;

  const apparatuses = [
    'floor_exercise',
    'pommel_horse',
    'still_rings',
    'vault',
    'parallel_bars',
    'high_bar',
  ];

  const { data: competition, error: compError } = await supabase
    .from('competitions')
    .insert({
      user_id: user.id,
      name: name,
      competition_date: date,
    })
    .select()
    .single();

  if (compError) {
    console.error('Error creating competition:', compError);
    throw new Error('Failed to create competition');
  }

  const scoreInserts = apparatuses.map((app) => {
    const value = formData.get(app);
    return {
      competition_id: competition.id,
      apparatus: app,
      value: value ? parseFloat(value.toString()) : 0,
    };
  });

  const { error: scoreError } = await supabase
    .from('scores')
    .insert(scoreInserts);

  if (scoreError) {
    console.error('Error saving scores:', scoreError);
    throw new Error('Failed to save scores');
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

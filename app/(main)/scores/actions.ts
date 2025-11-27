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
  const level = formData.get('level') as string | null;

  const rawStartDate = formData.get('start_date') as string;
  const rawEndDate = formData.get('end_date') as string;
  const startDate = rawStartDate ? rawStartDate : null;
  const endDate = rawEndDate ? rawEndDate : null;

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
      start_date: startDate,
      end_date: endDate,
      level: level,
    })
    .select()
    .single();

  if (compError) {
    console.error('Error creating competition:', compError);
    return { error: 'Failed to create competition record.' };
  }

  const scoreInserts = apparatuses.map((app) => {
    const rawValue = formData.get(app);
    const rawPlace = formData.get(`${app}_place`);

    return {
      competition_id: competition.id,
      apparatus: app,
      value: rawValue ? parseFloat(rawValue.toString()) : null,
      place: rawPlace ? parseInt(rawPlace.toString()) : null,
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
  redirect('/dashboard');
}

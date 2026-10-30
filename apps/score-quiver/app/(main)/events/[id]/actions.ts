'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const SetupSchema = z.object({
  environment: z.enum(['indoor', 'outdoor']),
  bow_style: z.string().min(1).nullable(),
  distance_m: z.number().positive().nullable(),
  face_cm: z.number().int().positive().nullable(),
});

export async function updateEventSetup(
  id: string,
  setup: z.infer<typeof SetupSchema>,
) {
  const parsed = SetupSchema.safeParse(setup);
  if (!parsed.success) return { error: 'Invalid setup' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('events')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath(`/events/${id}`);
  revalidatePath('/dashboard');
  revalidatePath('/insights');
  return { success: true };
}

export async function deleteEvent(id: string) {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from('events')
    .select('source_path')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) return { error: error.message };

  if (event?.source_path) {
    await supabase.storage.from('scorecards').remove([event.source_path]);
  }

  revalidatePath('/dashboard');
  revalidatePath('/insights');
  redirect('/dashboard');
}

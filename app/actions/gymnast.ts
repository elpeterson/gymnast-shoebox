'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const COOKIE_NAME = 'gymnast_shoebox_active_gymnast';

export async function setActiveGymnast(gymnastId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, gymnastId);
  redirect('/dashboard');
}

export async function getActiveGymnastId() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  return cookie?.value;
}

export async function ensureActiveGymnast() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const currentId = await getActiveGymnastId();

  if (currentId) {
    const { data: valid } = await supabase
      .from('gymnasts')
      .select('id')
      .eq('id', currentId)
      .eq('user_id', user.id)
      .single();

    if (valid) return currentId;
  }

  const { data: firstGymnast } = await supabase
    .from('gymnasts')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (firstGymnast) {
    return firstGymnast.id;
  }

  return null;
}

export async function createGymnast(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const name = formData.get('name') as string;
  if (!name) return { error: 'Name is required' };

  const { data, error } = await supabase
    .from('gymnasts')
    .insert({
      user_id: user.id,
      name: name,
      gender: 'male',
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  await setActiveGymnast(data.id);

  revalidatePath('/');
  return { success: true };
}

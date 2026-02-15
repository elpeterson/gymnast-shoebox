'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type UserSettings = {
  theme: string;
  show_start_values: boolean;
  show_placements: boolean;
};

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  show_start_values: false,
  show_placements: true,
};

export async function getUserSettings() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return DEFAULT_SETTINGS;

  const { data } = await supabase
    .from('user_settings')
    .select('theme, show_start_values, show_placements')
    .eq('user_id', user.id)
    .single();

  return data ? (data as UserSettings) : DEFAULT_SETTINGS;
}

export async function updateSetting(
  key: keyof UserSettings,
  value: string | boolean,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { error } = await supabase.from('user_settings').upsert(
    {
      user_id: user.id,
      [key]: value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    console.error('Error updating setting:', error);
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
}

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const origin =
    process.env.NEXT_PUBLIC_BASE_URL || 'https://gymnastshoebox.elpeterson.com';

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/account`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function signInWithMagicLink(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${
        process.env.NEXT_PUBLIC_BASE_URL ||
        'https://gymnastshoebox.elpeterson.com'
      }/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const origin =
    process.env.NEXT_PUBLIC_BASE_URL || 'https://gymnastshoebox.elpeterson.com';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/account&type=recovery`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
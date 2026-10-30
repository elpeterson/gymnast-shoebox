import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from './logout-button';
import Link from 'next/link';

export async function AuthButton() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-700">Hey, {user.email}</span>
      <LogoutButton />
    </div>
  ) : (
    <Link
      href="/login"
      className="text-sm font-semibold leading-6 text-gray-900 hover:text-indigo-600"
    >
      Log in <span aria-hidden="true">&rarr;</span>
    </Link>
  );
}

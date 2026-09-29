'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="text-sm font-semibold leading-6 hover:text-secondary transition-colors"
    >
      Log out <span aria-hidden="true">&rarr;</span>
    </button>
  );
}

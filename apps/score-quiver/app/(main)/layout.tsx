import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { UserNav } from '@/components/user-nav';
import { ArcherSwitcher } from '@/components/archer-switcher';
import { ensureActiveArcher } from '@/app/actions/archer';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: archers } = await supabase
    .from('archers')
    .select('id, name')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const activeArcherId = await ensureActiveArcher();

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <header className="sticky top-0 z-10 bg-[hsl(158_45%_16%)] border-b border-white/10 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/dashboard"
              className="hover:opacity-80 transition-opacity shrink-0"
            >
              <h1 className="text-xl font-bold text-white tracking-wide cursor-pointer hidden md:block">
                Score Quiver
              </h1>
              <h1 className="text-xl font-bold text-white tracking-wide cursor-pointer md:hidden">
                SQ
              </h1>
            </Link>

            <ArcherSwitcher
              archers={archers ?? []}
              activeArcherId={activeArcherId || undefined}
            />
          </div>

          <div className="flex items-center gap-4 text-white/90">
            <Link
              href="/insights"
              className="text-sm font-medium hover:text-white transition-colors hidden sm:block"
            >
              Insights
            </Link>
            <UserNav email={user.email} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

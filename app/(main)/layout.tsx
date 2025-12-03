import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { UserNav } from '@/components/user-nav';
import { GymnastSwitcher } from '@/components/gymnast-switcher';
import { ensureActiveGymnast } from '@/app/actions/gymnast';

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

  const { data: gymnasts } = await supabase
    .from('gymnasts')
    .select('id, name')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const activeGymnastId = await ensureActiveGymnast();

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <header className="sticky top-0 z-10 bg-[#262161] border-b border-white/10 shadow-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="hover:opacity-80 transition-opacity"
            >
              <h1 className="text-xl font-bold text-white tracking-wide cursor-pointer hidden md:block">
                Gymnast Shoebox
              </h1>
              <h1 className="text-xl font-bold text-white tracking-wide cursor-pointer md:hidden">
                GS
              </h1>
            </Link>

            {gymnasts && (
              <GymnastSwitcher
                gymnasts={gymnasts}
                activeGymnastId={activeGymnastId || undefined}
              />
            )}
          </div>

          <div className="flex items-center gap-4 text-white/90">
            <Link
              href="/about"
              className="text-sm font-medium hover:text-white transition-colors"
            >
              About
            </Link>
            <UserNav email={user.email} />
          </div>
        </div>
      </header>

      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

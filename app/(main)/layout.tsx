import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { UserNav } from '@/components/user-nav';

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

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <header className="sticky top-0 z-10 bg-primary border-b border-primary/10 shadow-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="hover:opacity-80 transition-opacity"
          >
            <h1 className="text-xl font-bold text-primary-foreground tracking-wide cursor-pointer">
              Gymnast Shoebox
            </h1>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/about"
              className="text-sm font-medium text-primary-foreground/80 hover:text-white transition-colors"
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

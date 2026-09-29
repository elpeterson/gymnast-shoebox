import { AuthButton } from '@/components/auth-button';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between p-6 lg:px-8 border-b">
        <div className="flex lg:flex-1">
          <span className="text-xl font-bold text-primary">Score Quiver</span>
        </div>
        <div className="flex flex-1 justify-end">
          <AuthButton />
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-muted/40">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Every arrow, remembered.
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl">
          Drop in your Between Ends scorecards and watch your archer improve,
          end by end, season over season. Private, and yours forever.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/dashboard"
            className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
          >
            Go to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}

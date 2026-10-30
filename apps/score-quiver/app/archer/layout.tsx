import Link from 'next/link';

export const metadata = {
  title: 'Archer · Score Quiver',
  robots: { index: false, follow: false },
};

/** Public, no-login shell for the archer POC. */
export default function ArcherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-[hsl(158_45%_16%)] border-b border-white/10 shadow-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link href="/archer" className="text-lg font-bold text-white tracking-wide hover:opacity-80">
            Score Quiver
          </Link>
          <span className="rounded-full border border-white/30 px-2 py-0.5 text-xs text-white/80">
            Proof of concept
          </span>
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">{children}</div>
    </div>
  );
}

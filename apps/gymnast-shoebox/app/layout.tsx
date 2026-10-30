import './globals.css';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeProvider } from '@/components/theme-provider';
import { getUserSettings } from '@/app/actions/settings';
import { ThemeSync } from '@/components/theme-sync';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Gymnast Shoebox',
  description: 'Track your gymnastics scores',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getUserSettings();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeSync serverTheme={settings.theme} />

          <main className="min-h-screen bg-background text-foreground">
            {children}
          </main>

          <Toaster />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}

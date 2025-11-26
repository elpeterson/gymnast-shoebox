import './globals.css';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Gymnast Shoebox',
  description: 'Track your gymnastics scores',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-gray-50">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}

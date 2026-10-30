import { AuthButton } from '@/components/auth-button';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between p-6 lg:px-8 bg-white border-b border-gray-100">
        <div className="flex lg:flex-1">
          <span className="text-xl font-bold text-indigo-600">
            Gymnast Shoebox
          </span>
        </div>
        <div className="flex flex-1 justify-end">
          <AuthButton />
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-gray-50">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Never lose a score again.
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl">
          The simple, digital shoebox for your gymnast&apos;s competition
          history. Secure, private, and always accessible.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/dashboard"
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Go to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}

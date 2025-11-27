'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

export function BetaBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('gymnast_beta_banner_dismissed');
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('gymnast_beta_banner_dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <Alert className="mb-6 bg-amber-50 border-amber-200 text-amber-900">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <div className="flex items-start justify-between w-full">
        <div>
          <AlertTitle className="text-amber-800 font-semibold">
            Welcome to the Beta!
          </AlertTitle>
          <AlertDescription className="mt-1 text-amber-700">
            If you were invited via email, you currently{' '}
            <strong>do not have a password</strong>.
            <br className="hidden sm:block" />
            Please go to your settings to create one so you can log in again
            later.
          </AlertDescription>
          <div className="mt-3">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100 hover:text-amber-950"
            >
              <Link href="/account">Set Password</Link>
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="h-6 w-6 text-amber-500 hover:text-amber-700 hover:bg-amber-100 -mt-1 -mr-1"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>
    </Alert>
  );
}

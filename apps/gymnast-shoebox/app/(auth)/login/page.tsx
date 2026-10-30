'use client';

import { useState, useTransition } from 'react';
import { login, signup, resetPassword } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [view, setView] = useState<'default' | 'forgot'>('default');

  const handleLogin = async (formData: FormData) => {
    setError(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) setError(result.error);
    });
  };

  const handleSignup = async (formData: FormData) => {
    setError(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const result = await signup(formData);
      if (result?.error) setError(result.error);
      else if (result?.success)
        setSuccessMessage('Please check your email to confirm your account.');
    });
  };

  const handleReset = async (formData: FormData) => {
    setError(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const result = await resetPassword(formData);
      if (result?.error) setError(result.error);
      else setSuccessMessage('Check your email for a password reset link.');
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            Gymnast Shoebox
          </CardTitle>
          <CardDescription>
            {view === 'forgot'
              ? 'Reset your password'
              : 'Sign in to track your scores'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4 text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="mb-4 text-left border-green-200 bg-green-50 text-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>

            {view === 'default' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Button
                    variant="link"
                    className="px-0 h-auto text-xs text-muted-foreground"
                    onClick={() => {
                      setView('forgot');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    type="button"
                  >
                    Forgot password?
                  </Button>
                </div>
                <Input id="password" name="password" type="password" required />
              </div>
            )}

            <div className="pt-2 space-y-3">
              {view === 'default' ? (
                <>
                  <Button
                    formAction={handleLogin}
                    className="w-full"
                    disabled={isPending}
                  >
                    Sign In with Password
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or
                      </span>
                    </div>
                  </div>

                  <Button
                    formAction={handleSignup}
                    variant="outline"
                    className="w-full"
                    disabled={isPending}
                  >
                    Register as a New User
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    formAction={handleReset}
                    className="w-full"
                    disabled={isPending}
                  >
                    Send Reset Link
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setView('default');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    type="button"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
                  </Button>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { login, signInWithMagicLink } from './actions';
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
import { AlertCircle, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      await login(formData);
    });
  };

  const handleMagicLink = async (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await signInWithMagicLink(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        toast.success('Magic Link Sent!', {
          description: 'Check your email for a link to log in.',
        });
      }
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            Gymnast Shoebox
          </CardTitle>
          <CardDescription>Sign in to track your scores</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4 text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input id="password" name="password" type="password" />
            </div>

            <div className="pt-2 space-y-3">
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
                formAction={handleMagicLink}
                variant="outline"
                className="w-full"
                disabled={isPending}
              >
                <Mail className="mr-2 h-4 w-4" />
                Email me a Login Link
              </Button>
            </div>

            <div className="mt-4 rounded-md bg-blue-50 p-4 text-sm text-blue-800 border border-blue-200">
              <p className="font-semibold mb-1">Private Beta Access</p>
              <p>Invite only. If you need an account, contact Eric.</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

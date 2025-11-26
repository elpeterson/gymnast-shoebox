import { login } from './actions';
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
import { AlertCircle } from 'lucide-react';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

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
          {params?.error && (
            <Alert variant="destructive" className="mb-4 text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{params.error}</AlertDescription>
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
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>

            <div className="pt-2">
              <Button formAction={login} className="w-full">
                Sign In
              </Button>
            </div>

            <div className="mt-4 rounded-md bg-blue-50 p-4 text-sm text-blue-800 border border-blue-200">
              <p className="font-semibold mb-1">Private Beta Access</p>
              <p>
                We are currently in a closed beta. If you would like to create
                an account, please contact <strong>Eric</strong> directly.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

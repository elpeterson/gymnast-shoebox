import { PasswordForm } from '@/components/password-form';

export default function AccountPage() {
  return (
    <div className="max-w-2xl mx-auto py-10 space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Account Settings</h2>
        <p className="text-muted-foreground">
          Manage your account credentials.
        </p>
      </div>

      <PasswordForm />
    </div>
  );
}

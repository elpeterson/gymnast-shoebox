import { PasswordForm } from '@/components/password-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function AccountPage() {
  return (
    <div className="max-w-4xl mx-auto py-10">
      <h2 className="text-3xl font-bold tracking-tight mb-6">
        Account Settings
      </h2>

      <Tabs defaultValue="security" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general" disabled>
            General
          </TabsTrigger>
          <TabsTrigger value="gymnasts" disabled className="relative">
            Gymnasts{' '}
            <span className="ml-2 text-[10px] bg-muted px-1 rounded text-muted-foreground">
              Soon
            </span>
          </TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          {/* TODO fill in with stuff for account name, maybe avatar? I dunno */}
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <PasswordForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

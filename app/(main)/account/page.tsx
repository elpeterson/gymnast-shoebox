import { createClient } from '@/lib/supabase/server';
import { PasswordForm } from '@/components/password-form';
import { GymnastList } from '@/components/gymnast-list'; // Import it
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch gymnasts for the list
  const { data: gymnasts } = await supabase
    .from('gymnasts')
    .select('id, name')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: true });

  return (
    <div className="max-w-4xl mx-auto py-10">
      <h2 className="text-3xl font-bold tracking-tight mb-6">
        Account Settings
      </h2>

      <Tabs defaultValue="gymnasts" className="space-y-4">
        <TabsList>
          {/* Enabled Gymnasts Tab, made it default for visibility */}
          <TabsTrigger value="gymnasts">Gymnasts</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="general" disabled>
            General
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gymnasts" className="space-y-4">
          {gymnasts && <GymnastList gymnasts={gymnasts} />}
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <PasswordForm />
        </TabsContent>

        <TabsContent value="general">
          {/* TODO fill in with stuff for account name, maybe avatar? I dunno */}
        </TabsContent>
      </Tabs>
    </div>
  );
}

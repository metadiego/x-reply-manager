import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data!.claims;

  const { data: profile } = await supabase
    .from('users_profiles')
    .select('*')
    .eq('id', user.sub)
    .single();

  return (
    <>
      <main className="flex-shrink-0 w-[600px]">
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Daily Digest Time</h3>
              <p className="text-sm text-muted-foreground">
                {profile?.daily_digest_time || 'Not configured'}
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Timezone</h3>
              <p className="text-sm text-muted-foreground">
                {profile?.timezone || 'UTC'}
              </p>
            </div>
          </div>
        </div>
      </main>
      <aside className="hidden lg:block flex-1 min-w-[350px]" />
    </>
  );
}
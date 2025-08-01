import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { TargetsManagement } from "@/components/targets/targets-management";

export default async function TargetsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  
  if (error || !data?.claims) {
    redirect("/");
  }

  const user = data.claims;
  
  // Get user profile
  const { data: profile } = await supabase
    .from('users_profiles')
    .select('*')
    .eq('id', user.sub)
    .single();

  // Get user's monitoring targets with their configurations
  const { data: targets, error: targetsError } = await supabase
    .from('monitoring_targets')
    .select(`
      *,
      topic_targets (*),
      twitter_list_targets (*)
    `)
    .eq('user_id', user.sub)
    .order('created_at', { ascending: false });

  if (targetsError) {
    console.error('Error fetching targets:', targetsError);
  }

  // Get target performance stats (mock for now)
  const targetStats = targets?.map(target => ({
    targetId: target.id,
    postsFound: Math.floor(Math.random() * 50) + 10, // Mock data
    repliesGenerated: Math.floor(Math.random() * 20) + 5, // Mock data
    lastProcessed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  })) || [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-6">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Monitoring Targets
            </h1>
            <p className="text-muted-foreground">
              Manage your topics and Twitter lists to monitor for engagement opportunities.
            </p>
          </div>

          {/* Targets Management Component */}
          <TargetsManagement 
            userId={user.sub}
            initialTargets={targets || []}
            targetStats={targetStats}
            profile={profile}
          />
        </div>
      </main>
    </div>
  );
}
import { createClient } from "@/lib/supabase/server";
import { TargetsManagement } from "@/components/targets/targets-management";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";

export default async function TargetsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login");
  }

  const supabase = await createClient();
  const userId = session.user.id;

  // Get user profile
  const { data: profile } = await supabase
    .from('users_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // Get user's monitoring targets with their configurations
  const { data: targets, error: targetsError } = await supabase
    .from('monitoring_targets')
    .select(`
      *,
      topic_targets (*),
      twitter_list_targets (*)
    `)
    .eq('user_id', userId)
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
    <>
      {/* Main Content */}
      <main className="flex-shrink-0 w-[600px]">
        <div className="p-6 space-y-6">
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

      {/* Right Sidebar (optional) */}
      <aside className="hidden lg:block flex-1 min-w-[350px]" />
    </>
  );
}
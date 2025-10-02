import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RepliesWithFilters } from "@/components/replies/replies-with-filters";
import { postReplyToTwitter, rejectReply, editReplySuggestion } from "@/app/actions/reply-actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login");
  }

  const supabase = await createClient();
  const userId = session.user.id;

  // Check if user has completed onboarding
  const { data: profile } = await supabase
    .from('users_profiles')
    .select('onboarding_completed')
    .eq('id', userId)
    .single();

  if (!profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  // Get today's start date (midnight)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // TODAY'S STATS
  // Get pending review today (status = 'pending')
  const { count: pendingReviewTodayCount } = await supabase
    .from('reply_suggestions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'pending')
    .gte('created_at', todayStart.toISOString());

  // Get skipped today
  const { count: skippedTodayCount } = await supabase
    .from('reply_suggestions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'skipped')
    .gte('updated_at', todayStart.toISOString());

  // Get accepted/posted today
  const { count: acceptedTodayCount } = await supabase
    .from('reply_suggestions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'posted')
    .gte('updated_at', todayStart.toISOString());

  // Get pending generation today (we'll check curated posts without suggestions)
  const { count: pendingGenerationTodayCount } = await supabase
    .from('curated_posts')
    .select(`
      twitter_post_id,
      reply_suggestions!left(id)
    `, { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('reply_suggestions.id', null)
    .gte('created_at', todayStart.toISOString());

  // ALL TIME STATS
  // Get all pending review (status = 'pending')
  const { count: pendingReviewAllTimeCount } = await supabase
    .from('reply_suggestions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'pending');

  // Get all skipped
  const { count: skippedAllTimeCount } = await supabase
    .from('reply_suggestions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'skipped');

  // Get all accepted/posted
  const { count: acceptedAllTimeCount } = await supabase
    .from('reply_suggestions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'posted');

  // Get recent replies count for header (last 7 days)
  const { count: recentRepliesCount } = await supabase
    .from('reply_suggestions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  // Get reply suggestions with curated posts and monitoring targets
  const { data: replySuggestions } = await supabase
    .from('reply_suggestions')
    .select(`
      id,
      suggested_reply,
      user_edited_reply,
      status,
      created_at,
      curated_posts!reply_suggestions_curated_post_id_fkey (
        twitter_post_id,
        post_content,
        post_author_handle,
        post_author_id,
        post_url,
        post_created_at,
        relevance_score,
        monitoring_target_id,
        monitoring_targets!curated_posts_monitoring_target_id_fkey (
          id,
          name
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  // Get all monitoring targets for filter dropdown
  const { data: monitoringTargets } = await supabase
    .from('monitoring_targets')
    .select('id, name')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('name');

  // Transform data to match expected format
  const formattedReplies = replySuggestions?.map(reply => {
    const curatedPost = Array.isArray(reply.curated_posts) ? reply.curated_posts[0] : reply.curated_posts;
    return {
      ...reply,
      curated_post: {
        ...curatedPost,
        monitoring_targets: Array.isArray(curatedPost.monitoring_targets)
          ? curatedPost.monitoring_targets[0]
          : curatedPost.monitoring_targets
      }
    };
  }) || [];

  return (
    <div className="flex w-full">
      {/* Main Content */}
      <main className="flex-shrink-0 w-[600px]">
        {/* Header */}
        <div className="bg-background">
          <div className="p-6">
            <h1 className="text-3xl font-bold tracking-tight">
              Reply Suggestions
            </h1>
            <p className="text-muted-foreground">
              Review and manage AI-generated replies • {recentRepliesCount || 0} this week
            </p>
          </div>
        </div>

        <div className="min-h-screen">
          {/* Reply Suggestions Feed */}
          <RepliesWithFilters
            replies={formattedReplies}
            monitoringTargets={monitoringTargets || []}
            onPost={postReplyToTwitter}
            onReject={rejectReply}
            onEdit={editReplySuggestion}
          />
        </div>
      </main>

      {/* Right Sidebar - Stats */}
      <aside className="flex-1 pl-6 pr-4">
        <div className="sticky top-0 pt-6">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">Your Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Today's Stats */}
              <div>
                <h3 className="font-semibold text-sm mb-3">Today</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Pending Review</span>
                    <span className="font-semibold">{pendingReviewTodayCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Skipped</span>
                    <span className="font-semibold text-gray-500">{skippedTodayCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Accepted</span>
                    <span className="font-semibold text-green-600">{acceptedTodayCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Pending Generation</span>
                    <span className="font-semibold text-amber-600">{pendingGenerationTodayCount || 0}</span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t"></div>

              {/* All Time Stats */}
              <div>
                <h3 className="font-semibold text-sm mb-3">All Time</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Pending Review</span>
                    <span className="font-semibold">{pendingReviewAllTimeCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Skipped</span>
                    <span className="font-semibold text-gray-500">{skippedAllTimeCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Accepted</span>
                    <span className="font-semibold text-green-600">{acceptedAllTimeCount || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </aside>
    </div>
  );
}
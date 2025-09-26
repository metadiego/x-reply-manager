import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModernRepliesList } from "@/components/replies/modern-replies-list";
import { postReplyToTwitter, rejectReply, editReplySuggestion } from "@/app/actions/reply-actions";
import { Twitter, Mail, Target, CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  const user = data!.claims;

  // Check user profile and Twitter connection status
  const { data: profile } = await supabase
    .from('users_profiles')
    .select('twitter_handle, twitter_user_id, subscription_tier, daily_digest_time, timezone, digest_configured')
    .eq('id', user.sub)
    .single();

  // Check if voice profile exists
  const { data: voiceProfile } = await supabase
    .from('voice_profiles')
    .select('user_id')
    .eq('user_id', user.sub)
    .single();

  // Get monitoring targets count
  const { count: targetsCount } = await supabase
    .from('monitoring_targets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.sub)
    .eq('status', 'active');

  // Get recent digest stats
  const { count: recentRepliesCount } = await supabase
    .from('reply_suggestions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.sub)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  // Get reply suggestions with curated posts
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
        post_url,
        post_created_at,
        engagement_score,
        relevance_score,
        total_score
      )
    `)
    .eq('user_id', user.sub)
    .order('created_at', { ascending: false })
    .limit(50);

  // Transform data to match expected format
  const formattedReplies = replySuggestions?.map(reply => ({
    ...reply,
    curated_post: Array.isArray(reply.curated_posts) ? reply.curated_posts[0] : reply.curated_posts
  })) || [];

  const setupSteps = [
    {
      title: "Set Up Monitoring Targets",
      description: "Add topics or Twitter lists to monitor for relevant posts",
      completed: (targetsCount || 0) > 0,
      href: "/targets",
      icon: Target
    },
    {
      title: "Configure Daily Digest",
      description: "Set your preferred time for receiving daily email digests",
      completed: !!profile?.digest_configured,
      href: "/settings",
      icon: Mail
    },
    {
      title: "AI Voice Training",
      description: "Train AI to write replies in your style",
      completed: !!voiceProfile,
      href: "/onboarding",
      icon: Clock
    }
  ];

  const allStepsCompleted = setupSteps.every(step => step.completed);

  return (
    <>
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
          {/* Setup Banner - Show at top if not completed */}
          {!allStepsCompleted && (
            <div className="border-b bg-amber-50 dark:bg-amber-950/20 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    Complete your setup
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    {setupSteps.filter(s => !s.completed).length} steps remaining to start receiving suggestions
                  </p>
                  <div className="flex gap-2 mt-2">
                    {setupSteps.filter(s => !s.completed).slice(0, 1).map((step) => (
                      <Button key={step.href} asChild size="sm" variant="outline">
                        <Link href={step.href}>{step.title}</Link>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reply Suggestions Feed */}
          <ModernRepliesList
            replies={formattedReplies}
            onPost={postReplyToTwitter}
            onReject={rejectReply}
            onEdit={editReplySuggestion}
          />
        </div>
      </main>

      {/* Right Sidebar (optional - for trends, etc) */}
      <aside className="hidden lg:block flex-1 min-w-[350px] pl-4 pr-4">
        <div className="sticky top-4 pt-4 space-y-4">
          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Active Targets</span>
                <span className="font-semibold">{targetsCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Weekly Replies</span>
                <span className="font-semibold">{recentRepliesCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Subscription</span>
                <span className="font-semibold capitalize">{profile?.subscription_tier || 'Free'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/targets">
                  <Target className="h-4 w-4 mr-2" />
                  Manage Targets
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/settings">
                  <Mail className="h-4 w-4 mr-2" />
                  Digest Settings
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </aside>
    </>
  );
}
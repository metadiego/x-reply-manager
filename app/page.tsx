import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/login-form";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RepliesList } from "@/components/replies/replies-list";
import { postReplyToTwitter, rejectReply, editReplySuggestion } from "@/app/actions/reply-actions";
import { Twitter, Mail, Target, CheckCircle, XCircle, AlertCircle, Clock, MessageSquare } from "lucide-react";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  
  // If user is not authenticated, show login/signup
  if (error || !data?.claims) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    );
  }

  // User is authenticated, show the main dashboard
  const user = data.claims;
  
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

  // Note: Twitter credentials check removed since all users authenticate via Twitter OAuth

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
      curated_post:curated_posts!inner (
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

  // Redirect new users to onboarding if they haven't completed setup
  if (!allStepsCompleted) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto py-6">
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold tracking-tight">
                Welcome to X Reply Manager!
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Let's get you set up with your personalized daily digest of engagement opportunities. 
                This will only take a few minutes.
              </p>
              <div className="flex justify-center pt-4">
                <Button asChild size="lg">
                  <Link href="/onboarding">
                    <Twitter className="mr-2 h-5 w-5" />
                    Start Setup
                  </Link>
                </Button>
              </div>
            </div>

            {/* Setup Progress Preview */}
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Setup Progress
                </CardTitle>
                <CardDescription>
                  Complete these steps to start receiving your daily digest
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {setupSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {step.completed ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-6">
        <div className="space-y-6">
          {/* Welcome Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back{profile?.twitter_handle ? `, @${profile.twitter_handle}` : ''}!
            </h1>
            <p className="text-muted-foreground">
              Manage your X engagement with AI-curated daily digests and personalized reply suggestions.
            </p>
          </div>

          {/* Setup Progress */}
          {!allStepsCompleted && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Complete Your Setup
                </CardTitle>
                <CardDescription>
                  Get started by completing these essential setup steps
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {setupSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {step.completed ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                      {!step.completed && step.href && (
                        <Button asChild size="sm">
                          <Link href={step.href}>
                            {step.title === "Connect Twitter Account" ? "Connect" : "Setup"}
                          </Link>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Dashboard Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Targets</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{targetsCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Monitoring topics and lists
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Replies</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recentRepliesCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Generated in last 7 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Subscription</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">
                  {profile?.subscription_tier || 'Free'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Current plan
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Digest Time</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {profile?.daily_digest_time || '--'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Daily digest delivery
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Reply Suggestions Section */}
          <div id="replies" className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <MessageSquare className="h-6 w-6" />
                Reply Suggestions
              </h2>
              <p className="text-muted-foreground">
                Review and manage AI-generated reply suggestions for your monitored topics.
              </p>
            </div>

            {/* Reply Suggestions List */}
            <RepliesList
              replies={replySuggestions || []}
              onPost={postReplyToTwitter}
              onReject={rejectReply}
              onEdit={editReplySuggestion}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

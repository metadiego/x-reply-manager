import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/login-form";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Twitter, Mail, Target, CheckCircle, XCircle, AlertCircle, Calendar, Clock, ExternalLink, BarChart3 } from "lucide-react";
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
    .select('twitter_handle, twitter_user_id, subscription_tier, daily_digest_time, timezone')
    .eq('id', user.sub)
    .single();

  // Check if user has Twitter provider linked via Supabase OAuth
  const { data: identities } = await supabase.auth.admin.getUserById(user.sub);
  const hasTwitterCredentials = identities?.user?.identities?.some(identity => identity.provider === 'twitter') ?? false;

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

  const setupSteps = [
    {
      title: "Connect Twitter Account",
      description: "Connect your Twitter account to start managing replies",
      completed: hasTwitterCredentials,
      href: hasTwitterCredentials ? undefined : "/",
      icon: Twitter
    },
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
      completed: !!profile?.daily_digest_time,
      href: "/settings",
      icon: Mail
    }
  ];

  const allStepsCompleted = setupSteps.every(step => step.completed);

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

          {/* Daily Digest Section */}
          <div id="digest" className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Today's Digest</h2>
              <p className="text-muted-foreground">
                Review curated posts and manage your reply suggestions for {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}.
              </p>
            </div>

            {/* Digest Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Daily Digest
                </CardTitle>
                <CardDescription>
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Digest processing in progress
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Your daily digest will be ready shortly. Check back in a few minutes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Empty State for when no digest is available */}
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No digest available yet</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Once your monitoring targets are set up and processing begins, your curated posts will appear here.
                </p>
                <div className="flex gap-2">
                  <Button asChild variant="outline">
                    <Link href="/targets">
                      Set Up Targets
                    </Link>
                  </Button>
                  <Button variant="outline">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Check Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          {allStepsCompleted && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Manage your X engagement workflow
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button asChild variant="outline">
                  <Link href="/targets">
                    <Target className="mr-2 h-4 w-4" />
                    Manage Targets
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/analytics">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Analytics
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/settings">
                    Settings
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

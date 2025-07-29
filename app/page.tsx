import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/login-form";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Twitter, Mail, Target, CheckCircle, XCircle, AlertCircle, Home, Settings, BarChart3 } from "lucide-react";
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
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link className="mr-6 flex items-center space-x-2" href="/">
              <Twitter className="h-6 w-6" />
              <span className="font-bold sm:inline-block">
                X Reply Manager
              </span>
            </Link>
          </div>
          
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link
                href="/"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                <Home className="h-4 w-4" />
              </Link>
              <Link
                href="/targets"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                <Target className="h-4 w-4" />
              </Link>
              <Link
                href="/digest"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                <Mail className="h-4 w-4" />
              </Link>
              <Link
                href="/analytics"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                <BarChart3 className="h-4 w-4" />
              </Link>
              <Link
                href="/settings"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </nav>
            
            <div className="flex items-center space-x-2">
              <ThemeSwitcher />
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
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
                <Button asChild>
                  <Link href="/digest">
                    <Mail className="mr-2 h-4 w-4" />
                    View Today's Digest
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/targets">
                    <Target className="mr-2 h-4 w-4" />
                    Manage Targets
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

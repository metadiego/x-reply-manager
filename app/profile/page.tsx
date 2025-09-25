import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/sidebar-nav";
import { User, Twitter, Calendar, CreditCard, Settings } from "lucide-react";
import Link from "next/link";

export default async function ProfilePage() {
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

  // Get user stats
  const { count: targetsCount } = await supabase
    .from('monitoring_targets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.sub)
    .eq('status', 'active');

  const { count: totalReplies } = await supabase
    .from('reply_suggestions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.sub);

  return (
    <div className="flex min-h-screen bg-background justify-center">
      <div className="flex w-full max-w-[1280px]">
        {/* Sidebar */}
        <div className="flex-shrink-0 w-[88px] xl:w-[275px]">
          <div className="sticky top-0 h-screen">
            <SidebarNav userHandle={profile?.twitter_handle} />
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 border-x">
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
              <p className="text-muted-foreground">
                Manage your account and subscription
              </p>
            </div>

            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm font-medium">{user.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Twitter Handle</label>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Twitter className="h-4 w-4 text-blue-500" />
                      @{profile?.twitter_handle || 'Not connected'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                    <p className="text-sm font-medium">
                      {profile?.created_at
                        ? new Date(profile.created_at).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">User ID</label>
                    <p className="text-xs font-mono text-muted-foreground">{user.sub}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Subscription
                </CardTitle>
                <CardDescription>
                  Your current plan and usage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold capitalize">
                      {profile?.subscription_tier || 'Free'} Plan
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Current subscription tier
                    </p>
                  </div>
                  <Button variant="outline">
                    Upgrade
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-2xl font-bold">{targetsCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Active Targets</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-2xl font-bold">{totalReplies || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Replies</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-2xl font-bold">
                      {profile?.daily_replies_limit || 10}
                    </p>
                    <p className="text-xs text-muted-foreground">Daily Limit</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 md:grid-cols-2">
                <Button asChild variant="outline">
                  <Link href="/settings">
                    Account Settings
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/targets">
                    Manage Targets
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/onboarding">
                    Voice Training
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/analytics">
                    View Analytics
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Twitter, Mail, User, Shield } from "lucide-react";
import { TwitterLoginButton } from "@/components/twitter-login-button";
import { AppHeader } from "@/components/app-header";

export default async function SettingsPage() {
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

  // Check if user has Twitter provider linked via Supabase OAuth
  const { data: userData } = await supabase.auth.getUser();
  const hasTwitterCredentials = userData?.user?.identities?.some(identity => identity.provider === 'twitter') ?? false;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto py-6">
        <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>
              Your basic account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Your email cannot be changed
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="user-id">User ID</Label>
              <Input
                id="user-id"
                value={user.sub}
                disabled
                className="bg-muted font-mono text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Twitter Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Twitter className="h-5 w-5" />
              Twitter Connection
            </CardTitle>
            <CardDescription>
              Manage your Twitter account connection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasTwitterCredentials && profile?.twitter_handle ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      Connected as @{profile.twitter_handle}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Twitter ID: {profile.twitter_user_id}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Test Connection
                  </Button>
                  <Button variant="destructive" size="sm">
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
                  <p className="text-amber-800 dark:text-amber-200">
                    Twitter account not connected
                  </p>
                </div>
                
                <TwitterLoginButton 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Digest Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Daily Digest
            </CardTitle>
            <CardDescription>
              Configure when you receive your daily digest
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="digest-time">Delivery Time</Label>
                <div className="flex gap-2">
                  <Input
                    id="digest-time"
                    type="time"
                    defaultValue={profile?.daily_digest_time || "09:00"}
                    className="flex-1"
                  />
                  <Select defaultValue={profile?.timezone || "UTC"}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">EST</SelectItem>
                      <SelectItem value="America/Chicago">CST</SelectItem>
                      <SelectItem value="America/Denver">MST</SelectItem>
                      <SelectItem value="America/Los_Angeles">PST</SelectItem>
                      <SelectItem value="Europe/London">GMT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button type="submit" size="sm">
                Update Digest Settings
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Subscription
            </CardTitle>
            <CardDescription>
              Your current subscription plan and usage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Current Plan</span>
                <span className="capitalize font-bold">
                  {profile?.subscription_tier || 'Free'}
                </span>
              </div>
              
              {profile?.subscription_tier === 'free' && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Free Plan Limits:</strong>
                  </p>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                    <li>• 5 daily replies</li>
                    <li>• 1 monitoring target</li>
                    <li>• Basic email digest</li>
                  </ul>
                </div>
              )}
            </div>
            
            <Button variant="outline" size="sm">
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Voice Training Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            AI Voice Training
          </CardTitle>
          <CardDescription>
            Help the AI learn your writing style for better reply suggestions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile?.voice_training_samples && profile.voice_training_samples.length > 0 ? (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-green-800 dark:text-green-200">
                  ✓ Voice training completed with {profile.voice_training_samples.length} samples
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Retrain Voice
                </Button>
                <Button variant="outline" size="sm">
                  View Samples
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-amber-800 dark:text-amber-200">
                  Voice training not yet completed
                </p>
              </div>
              
              <Button size="sm">
                Start Voice Training
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      </main>
    </div>
  );
}
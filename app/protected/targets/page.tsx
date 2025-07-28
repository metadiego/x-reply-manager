import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Plus, List, Hash } from "lucide-react";

export default async function TargetsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Monitoring Targets</h1>
          <p className="text-muted-foreground">
            Set up topics and Twitter lists to monitor for relevant posts.
          </p>
        </div>
        
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Target
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Create Topic Target */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Topic Monitoring
            </CardTitle>
            <CardDescription>
              Monitor tweets based on keywords and hashtags
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Track conversations around specific topics by setting keywords and hashtags to monitor.
              </p>
              <ul className="text-sm space-y-1">
                <li>• Add relevant keywords</li>
                <li>• Include hashtags to track</li>
                <li>• Set engagement thresholds</li>
                <li>• Filter out unwanted content</li>
              </ul>
            </div>
            
            <Button className="w-full" variant="outline">
              <Hash className="mr-2 h-4 w-4" />
              Create Topic Target
            </Button>
          </CardContent>
        </Card>

        {/* Create Twitter List Target */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Twitter List Monitoring
            </CardTitle>
            <CardDescription>
              Monitor tweets from your Twitter lists
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Keep track of posts from curated Twitter lists you follow or own.
              </p>
              <ul className="text-sm space-y-1">
                <li>• Select from your Twitter lists</li>
                <li>• Control retweet inclusion</li>
                <li>• Set daily post limits</li>
                <li>• Focus on quality content</li>
              </ul>
            </div>
            
            <Button className="w-full" variant="outline">
              <List className="mr-2 h-4 w-4" />
              Create List Target
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Target className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No monitoring targets yet</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Create your first monitoring target to start receiving curated posts in your daily digest.
          </p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Target
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
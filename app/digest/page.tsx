import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Calendar, Clock, ExternalLink } from "lucide-react";

export default async function DigestPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Daily Digest</h1>
        <p className="text-muted-foreground">
          Review today's curated posts and manage your reply suggestions.
        </p>
      </div>

      {/* Digest Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Digest
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

      {/* Empty State */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Mail className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No digest available yet</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Once your monitoring targets are set up and processing begins, your curated posts will appear here.
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <a href="/protected/targets">
                Set Up Targets
              </a>
            </Button>
            <Button variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              Check Email
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
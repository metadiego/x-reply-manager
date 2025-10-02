import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export default async function OnboardingWelcome() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login");
  }

  const supabase = await createClient();
  const userId = session.user.id;

  const { data: profile } = await supabase
    .from("users_profiles")
    .select("onboarding_completed")
    .eq("id", userId)
    .single();

  if (profile?.onboarding_completed) {
    redirect("/home");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
      <div className="text-center space-y-4 max-w-lg">
        <h1 className="text-4xl font-bold">Welcome to X Reply Manager</h1>
        <p className="text-lg text-muted-foreground">
          Your AI-powered assistant for managing X (Twitter) replies intelligently and efficiently.
        </p>
      </div>

      <div className="space-y-6 max-w-md">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-center">What you can do:</h2>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-start">
              <span className="mr-2">🎯</span>
              <span>Monitor specific X accounts and keywords for targeted engagement</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🤖</span>
              <span>Generate contextual, personalized replies using AI</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">📊</span>
              <span>Track engagement metrics and optimize your reply strategy</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">⚡</span>
              <span>Save time while maintaining authentic interactions</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <div className="flex space-x-1">
          <div className="w-8 h-1 bg-primary rounded-full" />
          <div className="w-8 h-1 bg-muted rounded-full" />
          <div className="w-8 h-1 bg-muted rounded-full" />
        </div>
        <span>Step 1 of 3</span>
      </div>

      <Button asChild size="lg" className="mt-4">
        <Link href="/onboarding/create-target" className="flex items-center">
          Get Started
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
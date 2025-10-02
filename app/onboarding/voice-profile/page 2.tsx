import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, CheckCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export default async function VoiceProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login");
  }

  const supabase = await createClient();
  const userId = session.user.id;

  // Get user profile with voice data
  const { data: userProfile } = await supabase
    .from("users_profiles")
    .select("voice_training_samples")
    .eq("id", userId)
    .single();

  // Default voice profile settings (can be enhanced with actual analysis)
  const voiceProfile = {
    tone: "professional",
    style: "concise",
    personality_traits: ["helpful", "knowledgeable", "friendly"],
    custom_instructions: "Be helpful and engaging while maintaining professionalism.",
    hasSamples: userProfile?.voice_training_samples && userProfile.voice_training_samples.length > 0
  };

  // Mark onboarding as completed and redirect to processing page
  async function completeOnboarding() {
    "use server";
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      redirect("/auth/login");
    }

    const supabase = await createClient();
    const userId = session.user.id;

    await supabase
      .from("users_profiles")
      .update({ onboarding_completed: true })
      .eq("id", userId);

    redirect("/onboarding/processing-user");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
      <div className="text-center space-y-4 max-w-lg">
        <h1 className="text-3xl font-bold">Your Voice Profile</h1>
        <p className="text-muted-foreground">
          We&apos;ve created a personalized voice profile to help generate replies that match your style.
        </p>
      </div>

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>AI Voice Settings</CardTitle>
              <CardDescription>
                Your replies will be generated using these preferences
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6">
            <div className="space-y-2">
              <h3 className="font-semibold">Tone</h3>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary">
                {voiceProfile?.tone || "Professional"}
              </div>
              <p className="text-sm text-muted-foreground">
                The overall tone of your generated replies
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Writing Style</h3>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary">
                {voiceProfile?.style || "Concise"}
              </div>
              <p className="text-sm text-muted-foreground">
                How your thoughts are structured and expressed
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Personality Traits</h3>
              <div className="flex flex-wrap gap-2">
                {(voiceProfile?.personality_traits || ["helpful", "knowledgeable", "friendly"]).map((trait: string) => (
                  <div key={trait} className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-secondary-foreground">
                    {trait}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Key characteristics that define your communication style
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Custom Instructions</h3>
              <p className="text-sm text-muted-foreground border-l-2 border-primary/20 pl-4 py-2">
                {voiceProfile?.custom_instructions || "Be helpful and engaging while maintaining professionalism."}
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-green-900 dark:text-green-100">
                {voiceProfile?.hasSamples
                  ? "Your voice profile has been personalized based on your Twitter activity!"
                  : "Your voice profile is ready!"}
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                You can customize these settings anytime from your profile settings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <div className="flex space-x-1">
          <div className="w-8 h-1 bg-muted rounded-full" />
          <div className="w-8 h-1 bg-muted rounded-full" />
          <div className="w-8 h-1 bg-primary rounded-full" />
        </div>
        <span>Step 3 of 3</span>
      </div>

      <div className="flex gap-4">
        <Button variant="outline" asChild>
          <Link href="/onboarding/create-target" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <form action={completeOnboarding}>
          <Button type="submit" size="lg" className="flex items-center">
            Complete Setup
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "@/components/onboarding-flow";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  
  if (error || !data?.claims) {
    redirect("/");
  }

  const user = data.claims;
  
  // Get user profile to check onboarding status
  const { data: profile } = await supabase
    .from('users_profiles')
    .select('*')
    .eq('id', user.sub)
    .single();

  // Check if user has monitoring targets
  const { count: targetsCount } = await supabase
    .from('monitoring_targets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.sub)
    .eq('status', 'active');

  // If user has completed all setup, redirect to home
  // Note: Twitter connection check removed since all users authenticate via Twitter OAuth
  if ((targetsCount || 0) > 0 && profile?.daily_digest_time && profile?.voice_training_samples?.length > 0) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <OnboardingFlow 
        user={user}
        profile={profile}
        targetsCount={targetsCount || 0}
      />
    </div>
  );
}
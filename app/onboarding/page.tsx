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
  const { data: profile, error: profileError } = await supabase
    .from('users_profiles')
    .select('*')
    .eq('id', user.sub)
    .maybeSingle(); // Use maybeSingle to avoid errors if profile doesn't exist

  console.log('Onboarding page - User profile check:', { profile, profileError });

  // If no profile exists, create one now (fallback for if the trigger didn't work)
  if (!profile && !profileError) {
    console.log('Creating user profile during onboarding page load for user:', user.sub);
    const { error: createError } = await supabase
      .from('users_profiles')
      .insert({ 
        id: user.sub,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (createError) {
      console.error('Failed to create user profile:', createError);
      // Continue anyway - the target setup component will handle this
    } else {
      console.log('Successfully created user profile');
    }
  }

  // Check if user has monitoring targets
  const { count: targetsCount, error: targetsError } = await supabase
    .from('monitoring_targets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.sub)
    .eq('status', 'active');

  console.log('Onboarding page - Targets count check:', { targetsCount, targetsError });

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
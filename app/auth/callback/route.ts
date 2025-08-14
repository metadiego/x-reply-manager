import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  console.log('Auth callback - Code received:', !!code)

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    console.log('Exchange result - Success:', !error, 'User:', !!data?.user)
    
    if (!error && data?.user) {
      console.log('User authenticated successfully:', data.user.id)
      
      // Check if user profile exists
      const { data: existingProfile } = await supabase
        .from('users_profiles')
        .select('id, twitter_handle, twitter_user_id')
        .eq('id', data.user.id)
        .maybeSingle();
      
      // Extract Twitter profile information if this is a Twitter OAuth
      if (data.user?.app_metadata?.provider === 'twitter' && data.user?.user_metadata) {
        const twitterData = data.user.user_metadata;
        const twitterUserId = twitterData.provider_id || twitterData.sub;
        const twitterHandle = twitterData.user_name || twitterData.preferred_username;
        
        console.log('Extracted Twitter data:', { twitterUserId, twitterHandle });
        
        if (twitterUserId && twitterHandle) {
          // Create or update profile with Twitter information
          if (!existingProfile) {
            // Create new profile
            const { error: profileError } = await supabase
              .from('users_profiles')
              .insert({
                id: data.user.id,
                twitter_handle: twitterHandle,
                twitter_user_id: twitterUserId,
                digest_configured: false, // Explicitly set to false for new users
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            
            if (profileError) {
              console.error('Failed to create user profile:', profileError);
            } else {
              console.log('Successfully created user profile with Twitter data');
            }
          } else if (!existingProfile.twitter_handle || !existingProfile.twitter_user_id) {
            // Update existing profile with Twitter data
            const { error: updateError } = await supabase
              .from('users_profiles')
              .update({
                twitter_handle: twitterHandle,
                twitter_user_id: twitterUserId,
                updated_at: new Date().toISOString()
              })
              .eq('id', data.user.id);
            
            if (updateError) {
              console.error('Failed to update user profile with Twitter data:', updateError);
            } else {
              console.log('Successfully updated user profile with Twitter data');
            }
          }
        }
      }
      
      // For new users (no profile), redirect to onboarding
      const shouldOnboard = !existingProfile;
      const redirectPath = shouldOnboard ? '/onboarding' : next;
      
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${redirectPath}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`)
      } else {
        return NextResponse.redirect(`${origin}${redirectPath}`)
      }
    } else {
      console.error('Authentication failed:', error?.message || 'Unknown error')
    }
  } else {
    console.error('No authorization code received')
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
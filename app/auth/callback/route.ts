import { createClient } from '@/lib/supabase/server'
import { twitterCredentialsService } from '@/lib/twitter-credentials'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/protected'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user && data.session) {
      // Check if this is a Twitter OAuth user and extract Twitter data
      const twitterData = data.user.user_metadata
      const session = data.session
      
      if (twitterData && twitterData.provider === 'twitter') {
        try {
          // Store Twitter credentials securely
          const credentialsStored = await twitterCredentialsService.storeCredentials(
            data.user.id,
            {
              accessToken: session.provider_token || '',
              refreshToken: session.provider_refresh_token || '',
              twitterUserId: twitterData.provider_id || twitterData.sub || '',
              twitterHandle: twitterData.user_name || twitterData.preferred_username || ''
            }
          );

          if (!credentialsStored) {
            console.error('Failed to store Twitter credentials')
          }

          // Update user profile with Twitter information (non-sensitive data only)
          const { error: updateError } = await supabase
            .from('users_profiles')
            .upsert({
              id: data.user.id,
              twitter_handle: twitterData.user_name || twitterData.preferred_username,
              twitter_user_id: twitterData.provider_id || twitterData.sub,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            })
            
          if (updateError) {
            console.error('Error updating user profile:', updateError)
          }
        } catch (profileError) {
          console.error('Error handling Twitter profile data:', profileError)
        }
      }
      
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
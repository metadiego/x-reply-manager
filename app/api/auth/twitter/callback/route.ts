import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { twitterCredentialsService } from '@/lib/twitter-credentials'
import { getTwitterUserProfile } from '@/lib/twitter-email'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  console.log('🐦 Custom Twitter OAuth Callback')
  console.log('📋 Params:', { code: code?.substring(0, 20) + '...', state, error })

  if (error) {
    console.error('❌ Twitter OAuth error:', error)
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${error}`)
  }

  if (!code) {
    console.error('❌ No authorization code received')
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=no_code`)
  }

  try {
    // Exchange code for access token
    console.log('🔄 Exchanging code for token')
    
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${origin}/api/auth/twitter/callback`,
        code_verifier: 'dummy_verifier', // In production, use the stored verifier
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('❌ Token exchange failed:', errorData)
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=token_exchange_failed`)
    }

    const tokenData = await tokenResponse.json()
    console.log('✅ Token received:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      tokenType: tokenData.token_type
    })

    // Get Twitter user profile
    const twitterProfile = await getTwitterUserProfile(tokenData.access_token)
    if (!twitterProfile) {
      console.error('❌ Failed to get Twitter profile')
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=profile_fetch_failed`)
    }

    console.log('👤 Twitter profile:', {
      id: twitterProfile.id,
      username: twitterProfile.username,
      name: twitterProfile.name,
      email: twitterProfile.email || 'not provided'
    })

    // Create or get Supabase user
    const supabase = await createClient()
    
    // Try to create a user with Twitter data
    const email = twitterProfile.email || `twitter_${twitterProfile.id}@x-reply-manager.local`
    
    console.log('📧 Using email for Supabase user:', email)

    // Create user in Supabase
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        provider: 'twitter',
        twitter_id: twitterProfile.id,
        twitter_username: twitterProfile.username,
        twitter_name: twitterProfile.name,
        twitter_email: twitterProfile.email,
        provider_id: twitterProfile.id,
        user_name: twitterProfile.username,
        preferred_username: twitterProfile.username,
        name: twitterProfile.name
      }
    })

    if (authError && authError.message !== 'User already registered') {
      console.error('❌ Supabase user creation failed:', authError)
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=user_creation_failed`)
    }

    let userId = authData?.user?.id

    // If user already exists, get their ID
    if (!userId || authError?.message === 'User already registered') {
      const { data: existingUser } = await supabase.auth.admin.getUserById(twitterProfile.id)
      if (!existingUser?.user) {
        // Try to find by email
        const { data: users } = await supabase.auth.admin.listUsers()
        const foundUser = users.users?.find(u => u.email === email)
        userId = foundUser?.id
      } else {
        userId = existingUser.user.id
      }
    }

    if (!userId) {
      console.error('❌ Could not determine user ID')
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=user_id_missing`)
    }

    console.log('👤 Supabase user ID:', userId)

    // Store Twitter credentials
    const credentialsStored = await twitterCredentialsService.storeCredentials(userId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || '',
      twitterUserId: twitterProfile.id,
      twitterHandle: twitterProfile.username
    })

    console.log('💾 Credentials stored:', credentialsStored)

    // Create a session for the user
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${origin}/protected`
      }
    })

    if (sessionError) {
      console.error('❌ Session creation failed:', sessionError)
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=session_creation_failed`)
    }

    console.log('✅ Authentication successful, redirecting to protected area')
    
    // Redirect to the magic link URL which will create the session
    return NextResponse.redirect(sessionData.properties.action_link)

  } catch (error) {
    console.error('🚨 Custom Twitter OAuth callback error:', error)
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=callback_error`)
  }
}
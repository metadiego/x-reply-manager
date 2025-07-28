import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'login') {
    // Initiate Twitter OAuth flow
    const state = Math.random().toString(36).substring(2, 15)
    const codeVerifier = Math.random().toString(36).substring(2, 128)
    
    // Store state and code verifier in session/cookie for later verification
    const twitterAuthUrl = new URL('https://twitter.com/i/oauth2/authorize')
    twitterAuthUrl.searchParams.set('response_type', 'code')
    twitterAuthUrl.searchParams.set('client_id', process.env.TWITTER_CLIENT_ID!)
    twitterAuthUrl.searchParams.set('redirect_uri', `${request.nextUrl.origin}/api/auth/twitter/callback`)
    twitterAuthUrl.searchParams.set('scope', 'tweet.read tweet.write users.read offline.access')
    twitterAuthUrl.searchParams.set('state', state)
    twitterAuthUrl.searchParams.set('code_challenge', codeVerifier)
    twitterAuthUrl.searchParams.set('code_challenge_method', 'plain')

    console.log('🐦 Initiating custom Twitter OAuth flow')
    console.log('🔗 Redirect URL:', twitterAuthUrl.toString())

    return NextResponse.redirect(twitterAuthUrl.toString())
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
import { NextResponse } from 'next/server'

export async function GET() {
  // Debug information about Twitter OAuth configuration
  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    hasTwitterClientId: !!process.env.TWITTER_CLIENT_ID,
    hasTwitterClientSecret: !!process.env.TWITTER_CLIENT_SECRET,
    twitterClientIdPrefix: process.env.TWITTER_CLIENT_ID ? 
      process.env.TWITTER_CLIENT_ID.substring(0, 10) + '...' : 'not set',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'not set',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY ? 
      'present' : 'not set'
  }

  console.log('🔍 Twitter OAuth Debug Info:', debugInfo)

  return NextResponse.json(debugInfo)
}
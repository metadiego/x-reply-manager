import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import TwitterApiService, { TwitterUserAnalysis } from '@/lib/twitter-api';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user authentication using secure getUser()
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the analysis data from request body
    const { analysis }: { analysis?: TwitterUserAnalysis } = await request.json();

    if (!analysis) {
      return NextResponse.json({ 
        error: 'Analysis data required. Please run user analysis first.' 
      }, { status: 400 });
    }

    // Get user's Twitter credentials for additional API calls if needed
    const { data: profile, error: profileError } = await supabase
      .from('users_profiles')
      .select('twitter_access_token, twitter_user_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.twitter_access_token) {
      return NextResponse.json({ 
        error: 'Twitter account not connected. Please connect your Twitter account first.' 
      }, { status: 400 });
    }

    // Initialize Twitter API service
    const twitterService = new TwitterApiService(profile.twitter_access_token);

    // Generate smart discovery suggestions
    const suggestions = await twitterService.generateSmartDiscovery(analysis);

    // Log API usage for list fetching
    await supabase
      .from('api_usage_log')
      .insert({
        user_id: user.id,
        operation_type: 'smart_discovery',
        posts_fetched: suggestions.suggestedLists.length, // Lists fetched
        estimated_cost_usd: suggestions.suggestedLists.length * 0.0001,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({ 
      success: true, 
      suggestions 
    });

  } catch (error: any) {
    console.error('Smart discovery error:', error);
    
    // Handle specific Twitter API errors
    if (error.message.includes('rate limit')) {
      return NextResponse.json({ 
        error: 'Twitter API rate limit reached. Please try again in 15 minutes.' 
      }, { status: 429 });
    }
    
    if (error.message.includes('authentication failed')) {
      return NextResponse.json({ 
        error: 'Twitter authentication expired. Please reconnect your Twitter account.' 
      }, { status: 401 });
    }

    return NextResponse.json({ 
      error: 'Failed to generate smart discovery suggestions. Please try again.' 
    }, { status: 500 });
  }
}
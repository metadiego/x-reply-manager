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

    // Get user's Twitter credentials
    const { data: profile, error: profileError } = await supabase
      .from('users_profiles')
      .select('twitter_access_token, twitter_user_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.twitter_access_token) {
      // Return a more informative response that allows fallback behavior
      return NextResponse.json({ 
        error: 'Twitter account not connected. Please connect your Twitter account first.',
        canFallback: true,
        fallbackSuggestions: [
          {
            name: "AI & Machine Learning",
            keywords: ["artificial intelligence", "machine learning", "AI"],
            hashtags: ["#AI", "#MachineLearning", "#ArtificialIntelligence"],
            confidence: 0.8,
            reason: "Popular professional topic"
          },
          {
            name: "Tech Industry News",
            keywords: ["technology", "startup", "innovation"],
            hashtags: ["#Tech", "#Startup", "#Innovation"],
            confidence: 0.7,
            reason: "Common industry interest"
          },
          {
            name: "Web Development",
            keywords: ["web development", "frontend", "backend"],
            hashtags: ["#WebDev", "#Frontend", "#Backend"],
            confidence: 0.6,
            reason: "Technical field"
          }
        ]
      }, { status: 200 }); // Change to 200 so it's not treated as an error
    }

    // Initialize Twitter API service
    const twitterService = new TwitterApiService(profile.twitter_access_token);

    // Analyze user's Twitter history
    const analysis = await twitterService.analyzeUserHistory(profile.twitter_user_id);

    // Log API usage
    await supabase
      .from('api_usage_log')
      .insert({
        user_id: user.id,
        operation_type: 'twitter_user_analysis',
        posts_fetched: analysis.recentTweets.length,
        estimated_cost_usd: analysis.recentTweets.length * 0.0001, // Rough estimate
        created_at: new Date().toISOString()
      });

    return NextResponse.json({ 
      success: true, 
      analysis 
    });

  } catch (error: any) {
    console.error('Twitter user analysis error:', error);
    
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
      error: 'Failed to analyze Twitter history. Please try again.' 
    }, { status: 500 });
  }
}
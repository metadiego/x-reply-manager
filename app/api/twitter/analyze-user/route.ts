import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Verify user authentication using secure getUser()
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Twitter handle from their profile
    const { data: profile, error: profileError } = await supabase
      .from('users_profiles')
      .select('twitter_handle, twitter_user_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.twitter_handle) {
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

    // DEPRECATED: This endpoint now returns a deprecation notice.
    // Twitter analysis is now handled by /api/twitter/analyze-onboarding
    // to prevent double-fetching of tweets during onboarding.
    console.log('DEPRECATED: /api/twitter/analyze-user called. Use /api/twitter/analyze-onboarding instead.');
    
    return NextResponse.json({ 
      error: 'This endpoint is deprecated. Use /api/twitter/analyze-onboarding for combined analysis.',
      canFallback: true,
      deprecationNotice: 'Please update your client to use /api/twitter/analyze-onboarding'
    }, { status: 200 });

  } catch (error) {
    console.error('Twitter user analysis error:', error);
    return NextResponse.json({ 
      error: 'This endpoint is deprecated. Use /api/twitter/analyze-onboarding for combined analysis.',
      canFallback: true,
      deprecationNotice: 'Please update your client to use /api/twitter/analyze-onboarding'
    }, { status: 200 });
  }
}
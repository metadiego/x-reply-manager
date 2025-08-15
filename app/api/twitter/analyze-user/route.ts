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

    // Initialize Twitter API service with app-only authentication (our Bearer token)
    const twitterService = TwitterApiService.createAppOnlyService();

    // Fetch and analyze user's Twitter history using their handle
    console.log(`Analyzing tweets for @${profile.twitter_handle}`);
    // TODO: should not double fetch tweets here.
    // const userTweets = await twitterService.getUserTweetsByUsername(profile.twitter_handle, 5);
    console.log('User tweets are:', userTweets);
    
    if (userTweets.length === 0) {
      return NextResponse.json({ 
        error: 'No recent tweets found',
        canFallback: true
      }, { status: 200 });
    }

    // Analyze the tweets to extract writing style
    const analysis: TwitterUserAnalysis = {
      user: {
        id: profile.twitter_user_id || '',
        username: profile.twitter_handle,
        name: profile.twitter_handle,
        followersCount: 0,
        followingCount: 0,
        tweetCount: userTweets.length
      },
      recentTweets: userTweets.slice(0, 20),
      writingStyle: {
        avgLength: Math.round(userTweets.reduce((sum, tweet) => sum + tweet.text.length, 0) / userTweets.length),
        commonWords: extractCommonWords(userTweets),
        tone: detectTone(userTweets),
        style: detectStyle(userTweets)
      },
      interests: extractInterests(userTweets),
      engagementRate: calculateEngagementRate(userTweets)
    };

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

// Helper functions for analyzing tweets
function extractCommonWords(tweets: any[]): string[] {
  const wordFrequency: Record<string, number> = {};
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'some', 'such', 'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'rt', 'via']);
  
  tweets.forEach(tweet => {
    const words = tweet.text.toLowerCase().split(/\s+/);
    words.forEach((word: string) => {
      // Clean word and filter out URLs, mentions, and short words
      const cleanWord = word.replace(/[^a-z0-9]/g, '');
      if (cleanWord.length > 3 && !stopWords.has(cleanWord) && !cleanWord.startsWith('http')) {
        wordFrequency[cleanWord] = (wordFrequency[cleanWord] || 0) + 1;
      }
    });
  });
  
  // Sort by frequency and return top 10
  return Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

function detectTone(tweets: any[]): 'professional' | 'casual' | 'technical' | 'friendly' {
  let professionalScore = 0;
  let casualScore = 0;
  let technicalScore = 0;
  let friendlyScore = 0;
  
  const professionalWords = ['business', 'professional', 'industry', 'strategy', 'management', 'enterprise', 'corporate'];
  const casualWords = ['lol', 'haha', 'gonna', 'wanna', 'yeah', 'cool', 'awesome'];
  const technicalWords = ['api', 'code', 'development', 'programming', 'software', 'algorithm', 'database'];
  const friendlyWords = ['thanks', 'appreciate', 'love', 'great', 'amazing', 'wonderful', 'excited'];
  
  tweets.forEach(tweet => {
    const text = tweet.text.toLowerCase();
    professionalWords.forEach(word => { if (text.includes(word)) professionalScore++; });
    casualWords.forEach(word => { if (text.includes(word)) casualScore++; });
    technicalWords.forEach(word => { if (text.includes(word)) technicalScore++; });
    friendlyWords.forEach(word => { if (text.includes(word)) friendlyScore++; });
  });
  
  const scores = [
    { tone: 'professional' as const, score: professionalScore },
    { tone: 'casual' as const, score: casualScore },
    { tone: 'technical' as const, score: technicalScore },
    { tone: 'friendly' as const, score: friendlyScore }
  ];
  
  return scores.sort((a, b) => b.score - a.score)[0].tone;
}

function detectStyle(tweets: any[]): string[] {
  const styles = [];
  
  // Check for questions
  const questionCount = tweets.filter(t => t.text.includes('?')).length;
  if (questionCount > tweets.length * 0.3) styles.push('inquisitive');
  
  // Check for links
  const linkCount = tweets.filter(t => t.text.includes('http')).length;
  if (linkCount > tweets.length * 0.5) styles.push('sharing');
  
  // Check for mentions
  const mentionCount = tweets.filter(t => t.text.includes('@')).length;
  if (mentionCount > tweets.length * 0.6) styles.push('conversational');
  
  // Check for hashtags
  const hashtagCount = tweets.filter(t => t.text.includes('#')).length;
  if (hashtagCount > tweets.length * 0.4) styles.push('hashtag-heavy');
  
  // Default styles if none detected
  if (styles.length === 0) {
    styles.push('informative', 'value-adding');
  }
  
  return styles;
}

function extractInterests(tweets: any[]): string[] {
  const interests = new Set<string>();
  
  const topicKeywords: Record<string, string[]> = {
    'technology': ['tech', 'software', 'app', 'digital', 'innovation'],
    'business': ['business', 'startup', 'entrepreneur', 'company', 'market'],
    'development': ['code', 'programming', 'developer', 'coding', 'build'],
    'design': ['design', 'ux', 'ui', 'user experience', 'interface'],
    'marketing': ['marketing', 'growth', 'seo', 'content', 'brand'],
    'ai': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'neural']
  };
  
  tweets.forEach(tweet => {
    const text = tweet.text.toLowerCase();
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        interests.add(topic);
      }
    });
  });
  
  return Array.from(interests);
}

function calculateEngagementRate(tweets: any[]): number {
  if (tweets.length === 0) return 0;
  
  const totalEngagement = tweets.reduce((sum, tweet) => {
    return sum + (tweet.metrics?.like_count || 0) + (tweet.metrics?.retweet_count || 0) + (tweet.metrics?.reply_count || 0);
  }, 0);
  
  return totalEngagement / tweets.length;
}
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import TwitterApiService, { TwitterTweet } from '@/lib/twitter-api';

// Mock AI service for generating topic suggestions from user posts
// In production, this would use OpenAI API
interface TopicSuggestion {
  name: string;
  keywords: string[];
  hashtags: string[];
  confidence: number;
  reason: string;
  relatedPosts: string[]; // IDs of posts that support this topic
}

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
      .select('twitter_handle')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.twitter_handle) {
      // Return fallback suggestions when Twitter handle isn't available
      return NextResponse.json({ 
        success: true,
        analysis: {
          postsAnalyzed: 0,
          topicSuggestions: getDefaultTopicSuggestions(),
          hasRealData: false,
          message: 'Twitter account not connected. Showing default suggestions.'
        }
      });
    }

    // Initialize Twitter API service with app-only authentication (our Bearer token)
    const twitterService = TwitterApiService.createAppOnlyService();

    // Fetch user's recent tweets using their public Twitter handle
    console.log(`Fetching tweets for @${profile.twitter_handle}`);
    const userTweets = await twitterService.getUserTweetsByUsername(profile.twitter_handle, 20);
    
    if (userTweets.length === 0) {
      return NextResponse.json({
        success: true,
        analysis: {
          postsAnalyzed: 0,
          topicSuggestions: getDefaultTopicSuggestions(),
          hasRealData: false,
          message: 'No recent tweets found. Showing default suggestions.'
        }
      });
    }

    // Analyze posts using AI to generate topic suggestions
    const topicSuggestions = await analyzePostsForTopics(userTweets);

    // Log API usage
    await supabase
      .from('api_usage_log')
      .insert({
        user_id: user.id,
        operation_type: 'posts_analysis',
        posts_fetched: userTweets.length,
        estimated_cost_usd: userTweets.length * 0.0001,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({ 
      success: true,
      analysis: {
        postsAnalyzed: userTweets.length,
        topicSuggestions,
        hasRealData: true,
        message: `Analyzed ${userTweets.length} recent tweets to generate personalized topics.`
      }
    });

  } catch (error: any) {
    console.error('Posts analysis error:', error);
    
    // Handle specific Twitter API errors
    if (error.message.includes('rate limit')) {
      return NextResponse.json({ 
        success: true,
        analysis: {
          postsAnalyzed: 0,
          topicSuggestions: getDefaultTopicSuggestions(),
          hasRealData: false,
          message: 'Twitter API rate limit reached. Showing default suggestions.'
        }
      });
    }
    
    if (error.message.includes('authentication failed')) {
      return NextResponse.json({ 
        success: true,
        analysis: {
          postsAnalyzed: 0,
          topicSuggestions: getDefaultTopicSuggestions(),
          hasRealData: false,
          message: 'Twitter authentication expired. Showing default suggestions.'
        }
      });
    }

    return NextResponse.json({ 
      success: true,
      analysis: {
        postsAnalyzed: 0,
        topicSuggestions: getDefaultTopicSuggestions(),
        hasRealData: false,
        message: 'Error analyzing posts. Showing default suggestions.'
      }
    });
  }
}

// Mock AI analysis function - in production this would use OpenAI
async function analyzePostsForTopics(tweets: TwitterTweet[]): Promise<TopicSuggestion[]> {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  const suggestions: TopicSuggestion[] = [];
  
  // Extract text content from all tweets
  const allText = tweets.map(tweet => tweet.text.toLowerCase()).join(' ');
  
  // Extract hashtags from tweets
  const hashtagMatches = allText.match(/#[\w]+/g) || [];
  const hashtags = [...new Set(hashtagMatches)];
  
  // Extract mentions and topics from context annotations
  const contextTopics = new Set<string>();
  tweets.forEach(tweet => {
    if (tweet.context_annotations) {
      tweet.context_annotations.forEach((annotation) => {
        if (annotation.entity?.name) {
          contextTopics.add(annotation.entity.name.toLowerCase());
        }
      });
    }
  });

  // Technology/AI detection
  const techKeywords = ['ai', 'artificial intelligence', 'machine learning', 'tech', 'software', 'code', 'programming', 'development', 'startup', 'innovation'];
  const techScore = techKeywords.reduce((score, keyword) => score + (allText.includes(keyword) ? 1 : 0), 0);
  
  if (techScore > 0 || hashtags.some(tag => ['#ai', '#tech', '#ml', '#programming', '#coding'].includes(tag.toLowerCase()))) {
    const relatedPosts = tweets.filter(tweet => 
      techKeywords.some(keyword => tweet.text.toLowerCase().includes(keyword))
    ).map(tweet => tweet.id);
    
    suggestions.push({
      name: "Technology & AI",
      keywords: ["artificial intelligence", "machine learning", "technology", "software development", "innovation"],
      hashtags: ["#AI", "#Tech", "#MachineLearning", "#Software", "#Innovation"],
      confidence: Math.min(0.95, 0.6 + (techScore * 0.1)),
      reason: `Found ${techScore} tech-related terms and ${relatedPosts.length} relevant posts`,
      relatedPosts: relatedPosts.slice(0, 3)
    });
  }

  // Business/Professional detection
  const businessKeywords = ['business', 'startup', 'entrepreneur', 'leadership', 'strategy', 'growth', 'marketing', 'sales', 'finance'];
  const businessScore = businessKeywords.reduce((score, keyword) => score + (allText.includes(keyword) ? 1 : 0), 0);
  
  if (businessScore > 0 || hashtags.some(tag => ['#business', '#startup', '#entrepreneurship'].includes(tag.toLowerCase()))) {
    const relatedPosts = tweets.filter(tweet => 
      businessKeywords.some(keyword => tweet.text.toLowerCase().includes(keyword))
    ).map(tweet => tweet.id);
    
    suggestions.push({
      name: "Business & Startups",
      keywords: ["business", "startup", "entrepreneurship", "leadership", "growth strategy"],
      hashtags: ["#Business", "#Startup", "#Entrepreneurship", "#Leadership", "#Growth"],
      confidence: Math.min(0.9, 0.6 + (businessScore * 0.1)),
      reason: `Found ${businessScore} business-related terms and ${relatedPosts.length} relevant posts`,
      relatedPosts: relatedPosts.slice(0, 3)
    });
  }

  // Industry-specific detection based on context annotations
  const industryTopics = Array.from(contextTopics).filter(topic => 
    ['finance', 'healthcare', 'education', 'marketing', 'design', 'fintech'].includes(topic)
  );

  if (industryTopics.length > 0) {
    const primaryIndustry = industryTopics[0];
    const relatedPosts = tweets.filter(tweet => 
      tweet.text.toLowerCase().includes(primaryIndustry) ||
      (tweet.context_annotations && tweet.context_annotations.some((ann) => 
        ann.entity?.name?.toLowerCase().includes(primaryIndustry)
      ))
    ).map(tweet => tweet.id);

    suggestions.push({
      name: `${primaryIndustry.charAt(0).toUpperCase() + primaryIndustry.slice(1)} Industry`,
      keywords: [primaryIndustry, `${primaryIndustry} trends`, `${primaryIndustry} news`, `${primaryIndustry} insights`],
      hashtags: [`#${primaryIndustry.charAt(0).toUpperCase() + primaryIndustry.slice(1)}`],
      confidence: 0.8,
      reason: `Frequently posts about ${primaryIndustry} based on tweet analysis`,
      relatedPosts: relatedPosts.slice(0, 3)
    });
  }

  // Personal interests based on frequent hashtags
  const frequentHashtags = hashtags.slice(0, 5);
  if (frequentHashtags.length > 0 && suggestions.length < 3) {
    suggestions.push({
      name: "Your Interests",
      keywords: frequentHashtags.map(tag => tag.substring(1)), // Remove # symbol
      hashtags: frequentHashtags,
      confidence: 0.7,
      reason: `Based on your frequent hashtag usage: ${frequentHashtags.join(', ')}`,
      relatedPosts: tweets.filter(tweet => 
        frequentHashtags.some(tag => tweet.text.includes(tag))
      ).map(tweet => tweet.id).slice(0, 3)
    });
  }

  // If no specific topics found, return general professional topics
  if (suggestions.length === 0) {
    return getDefaultTopicSuggestions();
  }

  return suggestions.slice(0, 4); // Return top 4 suggestions
}

function getDefaultTopicSuggestions(): TopicSuggestion[] {
  return [
    {
      name: "Technology & Innovation",
      keywords: ["technology", "innovation", "digital transformation", "tech trends"],
      hashtags: ["#Tech", "#Innovation", "#Digital", "#Technology"],
      confidence: 0.7,
      reason: "Popular professional topic",
      relatedPosts: []
    },
    {
      name: "Business Strategy",
      keywords: ["business strategy", "growth", "leadership", "management"],
      hashtags: ["#Business", "#Strategy", "#Leadership", "#Growth"],
      confidence: 0.6,
      reason: "Common professional interest",
      relatedPosts: []
    },
    {
      name: "Industry News",
      keywords: ["industry news", "market trends", "professional development"],
      hashtags: ["#Industry", "#News", "#Professional", "#Trends"],
      confidence: 0.5,
      reason: "General professional engagement",
      relatedPosts: []
    }
  ];
}
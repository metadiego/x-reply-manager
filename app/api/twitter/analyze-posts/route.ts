import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import TwitterApiService, { TwitterTweet } from '@/lib/twitter-api';
import OpenAI from 'openai';

interface TopicSuggestion {
  name: string;
  keywords: string[];
  hashtags: string[];
  confidence: number;
  reason: string;
  relatedPosts: string[]; // IDs of posts that support this topic
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

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
    // TODO: remove this once we finish testing and replace the 5 by 20
    const userTweets = await twitterService.getUserTweetsByUsername(profile.twitter_handle, 5);
    console.log('User tweets are:', userTweets);
    
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

    // Log API usage (Twitter API + OpenAI)
    // Rough cost estimate: 
    // - Twitter API: ~$0.0001 per tweet
    // - OpenAI GPT-3.5: ~$0.001 per 1K tokens (approx 0.002 for our usage)
    await supabase
      .from('api_usage_log')
      .insert({
        user_id: user.id,
        operation_type: 'posts_analysis',
        posts_fetched: userTweets.length,
        estimated_cost_usd: (userTweets.length * 0.0001) + 0.002,
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

// Use OpenAI to analyze tweets and generate topic suggestions
async function analyzePostsForTopics(tweets: TwitterTweet[]): Promise<TopicSuggestion[]> {
  try {
    // If OpenAI API key is not configured, fall back to default suggestions
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key') {
      console.log('OpenAI API key not configured, using fallback logic');
      return getDefaultTopicSuggestions();
    }

    // Prepare tweet texts for analysis
    const tweetTexts = tweets.map((tweet, index) => 
      `Tweet ${index + 1}: ${tweet.text}`
    ).join('\n');

    // Create a comprehensive prompt for OpenAI
    const prompt = `
      Analyze the user's recent tweets to identify key patterns and themes. Suggest exactly 4 distinct, 
      niche topic monitoring targets for X searches to find engagement opportunities.

      User's recent tweets:
      ${tweetTexts}

      Guidelines:
      - Summarize patterns first, then derive professional, industry-specific topics 
      (e.g., "AI Ethics in Healthcare", not "Technology").
      - Ensure topics are specific, diverse, and actionable; infer conservatively if needed.
      - Focus on sub-niches for value in expertise, connections, or visibility.

      For each topic, output as JSON object:
      - "name": Short, descriptive title.
      - "keywords": Exactly 3 searchable terms/phrases.
      - "hashtags": 3 relevant hashtags.
      - "confidence": Score 0.5–1.0 based on match strength.
      - "reason": 1–2 sentences on match and engagement value.

      Output: Valid JSON array of 4 objects only (no extra text). Example:
      [
        {
          "name": "AI in Marketing",
          "keywords": ["AI marketing automation", "AI marketing tools", "AI marketing strategies", "generative AI ads", "AI personalization marketing"],
          "hashtags": ["#AIMarketing", "#AIinMarketing", "#MarketingAI", "#MarTech", "#DigitalMarketing"],
          "confidence": 0.8,
          "reason": "User discusses AI in marketing campaigns; monitoring could reveal collaborations."
        }
      ]
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert at analyzing social media content and identifying user interests 
          and expertise areas. You help users discover relevant Twitter monitoring topics based on their 
          posting history.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      console.error('No response from OpenAI');
      return getDefaultTopicSuggestions();
    }

    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return getDefaultTopicSuggestions();
    }

    // Extract suggestions array from the response (handle different response structures)
    const suggestionsArray = Array.isArray(parsedResponse) 
      ? parsedResponse 
      : parsedResponse.suggestions || parsedResponse.topics || [];

    // Map the OpenAI suggestions to our TopicSuggestion format
    const suggestions: TopicSuggestion[] = suggestionsArray.map((suggestion: any) => {
      // Find related posts for each suggestion
      const relatedPosts = tweets.filter(tweet => {
        const tweetLower = tweet.text.toLowerCase();
        // Check if tweet contains any of the keywords
        return suggestion.keywords?.some((keyword: string) => 
          tweetLower.includes(keyword.toLowerCase())
        ) || suggestion.hashtags?.some((hashtag: string) => 
          tweetLower.includes(hashtag.toLowerCase())
        );
      }).map(tweet => tweet.id).slice(0, 3);

      return {
        name: suggestion.name || "Unknown Topic",
        keywords: Array.isArray(suggestion.keywords) ? suggestion.keywords : [],
        hashtags: Array.isArray(suggestion.hashtags) ? suggestion.hashtags : [],
        confidence: typeof suggestion.confidence === 'number' ? suggestion.confidence : 0.7,
        reason: suggestion.reason || "Based on your tweet analysis",
        relatedPosts
      };
    });

    // Ensure we have exactly 4 suggestions
    if (suggestions.length < 4) {
      // Add default suggestions to fill up to 4
      const defaults = getDefaultTopicSuggestions();
      return [...suggestions, ...defaults].slice(0, 4);
    }

    return suggestions.slice(0, 4);
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    // Fall back to default suggestions if OpenAI fails
    return getDefaultTopicSuggestions();
  }
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
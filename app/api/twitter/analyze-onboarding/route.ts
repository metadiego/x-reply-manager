import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import TwitterApiService, { TwitterTweet } from '@/lib/twitter-api';
import OpenAI from 'openai';

// Types for the combined analysis response

// TODO: change this to 20 once we finish testing
const MIN_TWEETS_FOR_ANALYSIS = 10;

interface TopicSuggestion {
  name: string;
  keywords: string[];
  hashtags: string[];
  confidence: number;
  reason: string;
  relatedPosts: string[];
}

interface VoiceAnalysis {
  sampleTweets: string[];
  voicePersonality: string;  // e.g., "thoughtful and analytical with a warm undertone"
  communicationStyle: string;  // e.g., "direct but encouraging, uses questions to engage"
  interests: string[];  // e.g., ["ai", "entrepreneurship"]
}

interface CombinedAnalysisResponse {
  success: boolean;
  tweets: TwitterTweet[];
  topicAnalysis: {
    postsAnalyzed: number;
    topicSuggestions: TopicSuggestion[];
    hasRealData: boolean;
    message: string;
  };
  voiceAnalysis: {
    postsAnalyzed: number;
    voiceProfile: VoiceAnalysis;
    hasRealData: boolean;
    message: string;
  };
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(): Promise<NextResponse<CombinedAnalysisResponse | { error: string }>> {
  try {
    const supabase = await createClient();
    
    // Verify user authentication
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
      // Return fallback analysis when Twitter handle isn't available
      return NextResponse.json({
        success: true,
        tweets: [],
        topicAnalysis: {
          postsAnalyzed: 0,
          topicSuggestions: getDefaultTopicSuggestions(),
          hasRealData: false,
          message: 'Twitter account not connected. Showing default suggestions.'
        },
        voiceAnalysis: {
          postsAnalyzed: 0,
          voiceProfile: getDefaultVoiceAnalysis(),
          hasRealData: false,
          message: 'Twitter account not connected. Using default voice profile.'
        }
      });
    }

    // Initialize Twitter API service with app-only authentication
    const twitterService = TwitterApiService.createAppOnlyService();

    // Fetch user's recent tweets (fetch more for better analysis)
    console.log(`Fetching tweets for @${profile.twitter_handle} for combined analysis`);
    const userTweets = await twitterService.getUserTweetsByUsername(profile.twitter_handle, MIN_TWEETS_FOR_ANALYSIS);

    if (userTweets.length === 0) {
      return NextResponse.json({
        success: true,
        tweets: [],
        topicAnalysis: {
          postsAnalyzed: 0,
          topicSuggestions: getDefaultTopicSuggestions(),
          hasRealData: false,
          message: 'No recent tweets found. Showing default suggestions.'
        },
        voiceAnalysis: {
          postsAnalyzed: 0,
          voiceProfile: getDefaultVoiceAnalysis(),
          hasRealData: false,
          message: 'No recent tweets found. Using default voice profile.'
        }
      });
    }

    // Run both analyses in parallel for better performance
    const [topicSuggestions, voiceAnalysis] = await Promise.all([
      analyzePostsForTopics(userTweets),
      analyzeVoiceStyle(userTweets)
    ]);

    // Log API usage (Twitter API + 2 OpenAI calls)
    // Cost breakdown:
    // - Twitter API: ~$0.0001 per tweet
    // - OpenAI Topic Analysis: ~$0.002 per analysis (gpt-4o-mini)
    // - OpenAI Voice Analysis: ~$0.002 per analysis (gpt-4o-mini)
    const twitterCost = userTweets.length * 0.0001;
    const openaiCost = 0.004; // Two OpenAI calls at ~$0.002 each
    
    await supabase
      .from('api_usage_log')
      .insert({
        user_id: user.id,
        operation_type: 'combined_onboarding_analysis',
        posts_fetched: userTweets.length,
        estimated_cost_usd: twitterCost + openaiCost,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      tweets: userTweets.slice(0, 20), // Return subset for potential UI display
      topicAnalysis: {
        postsAnalyzed: userTweets.length,
        topicSuggestions,
        hasRealData: true,
        message: `Analyzed ${userTweets.length} recent tweets to generate personalized insights.`
      },
      voiceAnalysis: {
        postsAnalyzed: userTweets.length,
        voiceProfile: voiceAnalysis,
        hasRealData: true,
        message: `Analyzed ${userTweets.length} recent tweets to create your personalized voice profile.`
      }
    });

  } catch (error: any) {
    console.error('Combined analysis error:', error);
    
    // Handle specific Twitter API errors gracefully
    if (error.message?.includes('rate limit')) {
      return NextResponse.json({
        success: true,
        tweets: [],
        topicAnalysis: {
          postsAnalyzed: 0,
          topicSuggestions: getDefaultTopicSuggestions(),
          hasRealData: false,
          message: 'Twitter API rate limit reached. Showing default suggestions.'
        },
        voiceAnalysis: {
          postsAnalyzed: 0,
          voiceProfile: getDefaultVoiceAnalysis(),
          hasRealData: false,
          message: 'Twitter API rate limit reached. Using default voice profile.'
        }
      });
    }

    return NextResponse.json({
      success: true,
      tweets: [],
      topicAnalysis: {
        postsAnalyzed: 0,
        topicSuggestions: getDefaultTopicSuggestions(),
        hasRealData: false,
        message: 'Error analyzing tweets. Showing default suggestions.'
      },
      voiceAnalysis: {
        postsAnalyzed: 0,
        voiceProfile: getDefaultVoiceAnalysis(),
        hasRealData: false,
        message: 'Error analyzing tweets. Using default voice profile.'
      }
    });
  }
}

// Topic analysis using OpenAI
async function analyzePostsForTopics(tweets: TwitterTweet[]): Promise<TopicSuggestion[]> {
  try {
    // If OpenAI API key is not configured, fall back to default suggestions
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key') {
      console.log('OpenAI API key not configured, using fallback logic');
      return getDefaultTopicSuggestions();
    }

    // Prepare tweet texts for analysis
    const tweetTexts = tweets.slice(0, 20).map((tweet, index) => 
      `Tweet ${index + 1}: ${tweet.text}`
    ).join('\n');

    // Create a comprehensive prompt for OpenAI
    const prompt = `
      Analyze the user's recent tweets to identify recurring patterns and themes. 
      Suggest exactly 4 distinct, niche topic monitoring targets for X searches to find engagement opportunities.

      User's recent tweets:
      ${tweetTexts}

      Guidelines:
      - Identify REPEATING themes or topics across the user's tweets, then derive professional, 
      industry-specific topics (e.g., "AI Ethics", not "Technology").
      - Ensure topics are specific, repeated across multiple tweets, diverse, and actionable; 
      infer conservatively if needed.
      - Focus on niches for value in expertise, connections, or visibility.

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
          "keywords": ["AI marketing automation", "AI marketing tools", "AI marketing strategies"],
          "hashtags": ["#AIMarketing", "#AIinMarketing", "#MarketingAI"],
          "confidence": 0.8,
          "reason": "User discusses AI in marketing campaigns; monitoring could reveal collaborations."
        }
      ]
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing social media content and identifying user interests and expertise areas."
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

    // Extract suggestions array from the response
    const suggestionsArray = Array.isArray(parsedResponse) 
      ? parsedResponse 
      : parsedResponse.suggestions || parsedResponse.topics || [];

    // Map the OpenAI suggestions to our TopicSuggestion format
    const suggestions: TopicSuggestion[] = suggestionsArray.map((suggestion: any) => {
      // Find related posts for each suggestion
      const relatedPosts = tweets.filter(tweet => {
        const tweetLower = tweet.text.toLowerCase();
        return suggestion.keywords?.some((keyword: string) => 
          tweetLower.includes(keyword.toLowerCase())
        ) || suggestion.hashtags?.some((hashtag: string) => 
          tweetLower.includes(hashtag.toLowerCase())
        );
      }).map(tweet => tweet.id).slice(0, 3);

      return {
        name: suggestion.name || "Unknown Topic",
        keywords: Array.isArray(suggestion.keywords) ? suggestion.keywords.slice(0, 5) : [],
        hashtags: Array.isArray(suggestion.hashtags) ? suggestion.hashtags.slice(0, 5) : [],
        confidence: typeof suggestion.confidence === 'number' ? suggestion.confidence : 0.7,
        reason: suggestion.reason || "Based on your tweet analysis",
        relatedPosts
      };
    });

    // Ensure we have exactly 4 suggestions
    if (suggestions.length < 4) {
      const defaults = getDefaultTopicSuggestions();
      return [...suggestions, ...defaults].slice(0, 4);
    }

    return suggestions.slice(0, 4);
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return getDefaultTopicSuggestions();
  }
}

// Voice and style analysis using OpenAI
async function analyzeVoiceStyle(tweets: TwitterTweet[]): Promise<VoiceAnalysis> {
  try {
    // If OpenAI API key is not configured, fall back to programmatic analysis
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key') {
      console.log('OpenAI API key not configured, using programmatic voice analysis');
      return getProgrammaticVoiceAnalysis(tweets);
    }

    const tweetTexts = tweets.map(t => t.text);
    
    // Prepare tweet texts for analysis
    const tweetSample = tweets.slice(0, 15).map((tweet, index) => 
      `Tweet ${index + 1}: ${tweet.text}`
    ).join('\n');

    // Create a comprehensive prompt for voice analysis
    const prompt = `
      Analyze the writing style, tone, and voice characteristics of this user based on their recent tweets. 
      Provide a detailed qualitative analysis that captures their unique voice and communication approach.

      User's recent tweets:
      ${tweetSample}

      Analyze and provide:
      1. **Voice Personality**: A 1-2 sentence description of their overall personality and tone as expressed through writing (e.g., "thoughtful and analytical with a warm undertone", "energetic and optimistic with a focus on actionable insights")
      2. **Communication Style**: A 1-2 sentence description of how they communicate and engage (e.g., "direct but encouraging, uses questions to engage", "conversational storyteller who shares personal experiences to illustrate points")
      3. **Key Interests**: 3-5 main topics or themes they frequently discuss or show expertise in

      Return as JSON with this exact structure:
      {
        "voicePersonality": "1-2 sentence personality description",
        "communicationStyle": "1-2 sentence communication approach description", 
        "interests": ["interest1", "interest2", "interest3", "interest4"]
      }
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert writing style analyst who helps AI systems understand how to write in
           someone's voice and tone. Focus on actionable insights for style replication.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent analysis
      max_tokens: 800,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      console.error('No response from OpenAI for voice analysis');
      return getProgrammaticVoiceAnalysis(tweets);
    }

    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
    } catch (parseError) {
      console.error('Error parsing OpenAI voice analysis response:', parseError);
      return getProgrammaticVoiceAnalysis(tweets);
    }

    // Map OpenAI response to our VoiceAnalysis format
    const voiceAnalysis: VoiceAnalysis = {
      sampleTweets: tweetTexts.slice(0, 3),
      voicePersonality: parsedResponse.voicePersonality || 'Professional and informative with a helpful tone',
      communicationStyle: parsedResponse.communicationStyle || 'Clear and direct communication with focus on value-driven content',
      interests: Array.isArray(parsedResponse.interests) ? parsedResponse.interests : ['technology', 'business']
    };

    console.log('OpenAI voice analysis completed successfully');
    return voiceAnalysis;

  } catch (error) {
    console.error('Error calling OpenAI API for voice analysis:', error);
    return getProgrammaticVoiceAnalysis(tweets);
  }
}

// Fallback programmatic voice analysis (simplified version of original)
function getProgrammaticVoiceAnalysis(tweets: TwitterTweet[]): VoiceAnalysis {
  const tweetTexts = tweets.map(t => t.text);
  const tone = detectTone(tweets);
  const style = detectStyle(tweets);
  const interests = extractInterests(tweets);
  
  // Generate descriptive voice personality based on detected patterns
  const voicePersonality = generateVoicePersonality(tone, style);
  const communicationStyle = generateCommunicationStyle(style, tweets);
  
  return {
    sampleTweets: tweetTexts.slice(0, 3),
    voicePersonality,
    communicationStyle,
    interests
  };
}

// Helper functions for voice analysis

function detectTone(tweets: TwitterTweet[]): 'professional' | 'casual' | 'technical' | 'friendly' {
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

function detectStyle(tweets: TwitterTweet[]): string[] {
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

function extractInterests(tweets: TwitterTweet[]): string[] {
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

function generateVoicePersonality(tone: string, style: string[]): string {
  const toneDescriptions = {
    'professional': 'Professional and authoritative',
    'casual': 'Relaxed and approachable',
    'technical': 'Analytical and detail-oriented',
    'friendly': 'Warm and engaging'
  };
  
  const styleContext = style.includes('inquisitive') ? ' with a curious and questioning approach' :
                      style.includes('sharing') ? ' who enjoys sharing valuable resources' :
                      style.includes('conversational') ? ' with a social and interactive style' :
                      ' with a focused and informative approach';
  
  return `${toneDescriptions[tone as keyof typeof toneDescriptions] || 'Professional and informative'}${styleContext}`;
}

function generateCommunicationStyle(style: string[], tweets: TwitterTweet[]): string {
  const hasQuestions = tweets.some(t => t.text.includes('?'));
  const hasLinks = tweets.some(t => t.text.includes('http'));
  const hasMentions = tweets.some(t => t.text.includes('@'));
  
  let styleDesc = 'Communicates through ';
  
  if (hasQuestions && style.includes('inquisitive')) {
    styleDesc += 'thoughtful questions and engaging discussions';
  } else if (hasLinks && style.includes('sharing')) {
    styleDesc += 'curated content and valuable resource sharing';
  } else if (hasMentions && style.includes('conversational')) {
    styleDesc += 'active networking and community engagement';
  } else {
    styleDesc += 'clear and informative content delivery';
  }
  
  return styleDesc + ', focusing on providing value to the audience';
}

// Default fallback suggestions
function getDefaultTopicSuggestions(): TopicSuggestion[] {
  return [
    {
      name: "Technology & Innovation",
      keywords: ["technology", "innovation", "digital transformation", "tech trends", "emerging tech"],
      hashtags: ["#Tech", "#Innovation", "#Digital", "#Technology", "#TechTrends"],
      confidence: 0.7,
      reason: "Popular professional topic for engagement",
      relatedPosts: []
    },
    {
      name: "Business Strategy",
      keywords: ["business strategy", "growth", "leadership", "management", "entrepreneurship"],
      hashtags: ["#Business", "#Strategy", "#Leadership", "#Growth"],
      confidence: 0.6,
      reason: "Common professional interest area",
      relatedPosts: []
    },
    {
      name: "Industry News",
      keywords: ["industry news", "market trends", "professional development", "insights"],
      hashtags: ["#Industry", "#News", "#Professional", "#Trends"],
      confidence: 0.5,
      reason: "General professional engagement",
      relatedPosts: []
    },
    {
      name: "Career Development",
      keywords: ["career growth", "skills", "networking", "opportunities", "professional"],
      hashtags: ["#Career", "#ProfessionalDevelopment", "#Networking"],
      confidence: 0.5,
      reason: "Universal professional interest",
      relatedPosts: []
    }
  ];
}

function getDefaultVoiceAnalysis(): VoiceAnalysis {
  return {
    sampleTweets: [],
    voicePersonality: "Professional and informative with a helpful tone",
    communicationStyle: "Clear and direct communication with focus on value-driven content",
    interests: ["technology", "business", "professional development"]
  };
}
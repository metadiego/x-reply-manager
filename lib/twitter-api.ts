// Twitter API v2 service for secure server-side operations
// This service handles all Twitter API interactions with proper authentication and rate limiting

export interface TwitterUser {
  id: string;
  username: string;
  name: string;
  description?: string;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
  verified?: boolean;
  created_at: string;
}

export interface TwitterTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
  };
  context_annotations?: Array<{
    domain: {
      id: string;
      name: string;
      description: string;
    };
    entity: {
      id: string;
      name: string;
      description?: string;
    };
  }>;
  lang?: string;
  referenced_tweets?: Array<{
    type: 'retweeted' | 'quoted' | 'replied_to';
    id: string;
  }>;
}

export interface TwitterList {
  id: string;
  name: string;
  description?: string;
  follower_count?: number;
  member_count?: number;
  private: boolean;
  owner_id: string;
  created_at: string;
}

export interface TwitterApiResponse<T> {
  data?: T;
  includes?: {
    users?: TwitterUser[];
    tweets?: TwitterTweet[];
  };
  meta?: {
    result_count: number;
    next_token?: string;
    previous_token?: string;
  };
  errors?: Array<{
    detail: string;
    title: string;
    resource_type: string;
    parameter: string;
    value: string;
    type: string;
  }>;
}

export interface TwitterUserAnalysis {
  user: TwitterUser;
  recentTweets: TwitterTweet[];
  writingStyle: {
    avgLength: number;
    commonWords: string[];
    tone: 'professional' | 'casual' | 'technical' | 'friendly';
    style: string[];
    languageDetected: string;
  };
  topicInterests: string[];
  engagementPatterns: {
    avgLikes: number;
    avgRetweets: number;
    avgReplies: number;
    bestPerformingTweets: TwitterTweet[];
  };
}

export class TwitterApiService {
  private baseUrl = 'https://api.twitter.com/2';
  
  constructor(private accessToken: string, private refreshToken?: string) {}

  /**
   * Create a service instance using app-only authentication (Bearer Token)
   * This allows fetching public data without user-specific tokens
   */
  static createAppOnlyService(): TwitterApiService {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken) {
      throw new Error('TWITTER_BEARER_TOKEN environment variable is required');
    }
    return new TwitterApiService(bearerToken);
  }

  /**
   * Get authenticated user's profile information
   */
  async getMe(): Promise<TwitterUser> {
    const response = await this.makeRequest<TwitterUser>(
      '/users/me',
      {
        'user.fields': 'description,public_metrics,verified,created_at'
      }
    );
    
    if (!response.data) {
      throw new Error('Failed to fetch user profile');
    }
    
    return response.data;
  }

  /**
   * Get user's recent tweets for analysis (up to 100 most recent)
   */
  async getUserTweets(userId: string, maxResults: number = 20): Promise<TwitterTweet[]> {
    const response = await this.makeRequest<TwitterTweet[]>(
      `/users/${userId}/tweets`,
      {
        'max_results': Math.min(maxResults, 20).toString(),
        'tweet.fields': 'created_at,public_metrics,context_annotations,lang,referenced_tweets',
        'exclude': 'retweets,replies' // Focus on original content
      }
    );
    
    return response.data || [];
  }

  /**
   * Get user's recent tweets by username (for app-only authentication)
   */
  async getUserTweetsByUsername(username: string, maxResults: number = 20): Promise<TwitterTweet[]> {
    // First, get the user ID from username
    const userResponse = await this.makeRequest<TwitterUser>(
      `/users/by/username/${username}`,
      {
        'user.fields': 'id,username,name,public_metrics'
      }
    );

    if (!userResponse.data) {
      throw new Error(`User @${username} not found`);
    }

    // Then get their tweets using the user ID
    return this.getUserTweets(userResponse.data.id, maxResults);
  }

  /**
   * Get user's Twitter lists
   */
  async getUserLists(userId: string): Promise<TwitterList[]> {
    const response = await this.makeRequest<TwitterList[]>(
      `/users/${userId}/owned_lists`,
      {
        'list.fields': 'description,follower_count,member_count,private,created_at'
      }
    );
    
    return response.data || [];
  }

  /**
   * Get user's list memberships (lists they're added to)
   */
  async getUserListMemberships(userId: string): Promise<TwitterList[]> {
    const response = await this.makeRequest<TwitterList[]>(
      `/users/${userId}/list_memberships`,
      {
        'list.fields': 'description,follower_count,member_count,private,created_at',
        'expansions': 'owner_id',
        'user.fields': 'username,name,verified'
      }
    );
    
    return response.data || [];
  }

  /**
   * Search for tweets by query
   */
  async searchTweets(
    query: string, 
    options: {
      maxResults?: number;
      sinceId?: string;
      untilId?: string;
      startTime?: string;
      endTime?: string;
    } = {}
  ): Promise<TwitterTweet[]> {
    const params: Record<string, string> = {
      'query': query,
      'tweet.fields': 'created_at,public_metrics,context_annotations,lang,referenced_tweets',
      'expansions': 'author_id',
      'user.fields': 'username,name,verified,public_metrics',
      'max_results': (options.maxResults || 10).toString()
    };

    if (options.sinceId) params.since_id = options.sinceId;
    if (options.untilId) params.until_id = options.untilId;
    if (options.startTime) params.start_time = options.startTime;
    if (options.endTime) params.end_time = options.endTime;

    const response = await this.makeRequest<TwitterTweet[]>('/tweets/search/recent', params);
    return response.data || [];
  }

  /**
   * Analyze user's Twitter history for voice training and smart discovery
   */
  async analyzeUserHistory(userId: string): Promise<TwitterUserAnalysis> {
    // Get user profile and recent tweets in parallel
    const [user, tweets] = await Promise.all([
      this.getMe(),
      this.getUserTweets(userId, 100)
    ]);

    // Analyze writing style
    const writingStyle = this.analyzeWritingStyle(tweets);
    
    // Extract topic interests from context annotations and content
    const topicInterests = this.extractTopicInterests(tweets);
    
    // Analyze engagement patterns
    const engagementPatterns = this.analyzeEngagementPatterns(tweets);

    return {
      user,
      recentTweets: tweets.slice(0, 20), // Return only most recent 20 for display
      writingStyle,
      topicInterests,
      engagementPatterns
    };
  }

  /**
   * Generate smart discovery suggestions based on user's Twitter history
   */
  async generateSmartDiscovery(analysis: TwitterUserAnalysis): Promise<{
    suggestedTopics: Array<{
      name: string;
      keywords: string[];
      hashtags: string[];
      confidence: number;
      reason: string;
    }>;
    suggestedLists: TwitterList[];
  }> {
    // Generate topic suggestions based on interests and context annotations
    const suggestedTopics = this.generateTopicSuggestions(analysis);
    
    // Get user's lists for suggestions
    const suggestedLists = await this.getUserLists(analysis.user.id);

    return {
      suggestedTopics,
      suggestedLists: suggestedLists.slice(0, 10) // Limit to top 10 lists
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<TwitterApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Twitter API authentication failed. Please reconnect your Twitter account.');
      }
      if (response.status === 429) {
        throw new Error('Twitter API rate limit exceeded. Please try again later.');
      }
      throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.errors && data.errors.length > 0) {
      throw new Error(`Twitter API error: ${data.errors[0].detail}`);
    }

    return data;
  }

  private analyzeWritingStyle(tweets: TwitterTweet[]) {
    if (tweets.length === 0) {
      return {
        avgLength: 0,
        commonWords: [],
        tone: 'casual' as const,
        style: [],
        languageDetected: 'en'
      };
    }

    // Calculate average length
    const avgLength = tweets.reduce((sum, tweet) => sum + tweet.text.length, 0) / tweets.length;

    // Extract common words (excluding common stop words)
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their']);
    
    const wordCounts = new Map<string, number>();
    tweets.forEach(tweet => {
      // Remove URLs, mentions, hashtags for word analysis
      const cleanText = tweet.text
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/@[^\s]+/g, '')
        .replace(/#[^\s]+/g, '')
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ');
      
      const words = cleanText.split(/\s+/).filter(word => 
        word.length > 2 && !stopWords.has(word) && !/^\d+$/.test(word)
      );
      
      words.forEach(word => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      });
    });

    const commonWords = Array.from(wordCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);

    // Analyze tone based on content patterns
    const professionalKeywords = ['business', 'strategy', 'growth', 'innovation', 'leadership', 'market', 'industry', 'professional', 'company', 'team'];
    const technicalKeywords = ['technology', 'tech', 'software', 'development', 'coding', 'programming', 'api', 'data', 'ai', 'machine', 'learning'];
    const casualKeywords = ['lol', 'haha', 'awesome', 'cool', 'great', 'love', 'fun', 'amazing'];

    const allText = tweets.map(t => t.text.toLowerCase()).join(' ');
    const professionalScore = professionalKeywords.reduce((score, word) => score + (allText.includes(word) ? 1 : 0), 0);
    const technicalScore = technicalKeywords.reduce((score, word) => score + (allText.includes(word) ? 1 : 0), 0);
    const casualScore = casualKeywords.reduce((score, word) => score + (allText.includes(word) ? 1 : 0), 0);

    let tone: 'professional' | 'casual' | 'technical' | 'friendly' = 'friendly';
    const maxScore = Math.max(professionalScore, technicalScore, casualScore);
    if (maxScore > 0) {
      if (professionalScore === maxScore) tone = 'professional';
      else if (technicalScore === maxScore) tone = 'technical';
      else if (casualScore === maxScore) tone = 'casual';
    }

    // Analyze style patterns
    const style: string[] = [];
    const questionTweets = tweets.filter(t => t.text.includes('?')).length;
    const threadTweets = tweets.filter(t => t.text.includes('🧵') || t.text.includes('thread') || t.text.includes('1/')).length;
    const hashtagTweets = tweets.filter(t => /#\w+/.test(t.text)).length;

    if (questionTweets / tweets.length > 0.2) style.push('question-asking');
    if (threadTweets > 2) style.push('thread-creator');
    if (hashtagTweets / tweets.length > 0.5) style.push('hashtag-user');
    if (avgLength > 200) style.push('detailed-writer');
    else if (avgLength < 100) style.push('concise-writer');

    // Detect primary language
    const languageCounts = new Map<string, number>();
    tweets.forEach(tweet => {
      if (tweet.lang) {
        languageCounts.set(tweet.lang, (languageCounts.get(tweet.lang) || 0) + 1);
      }
    });
    const languageDetected = Array.from(languageCounts.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'en';

    return {
      avgLength: Math.round(avgLength),
      commonWords,
      tone,
      style: style.length > 0 ? style : ['conversational'],
      languageDetected
    };
  }

  private extractTopicInterests(tweets: TwitterTweet[]): string[] {
    const topics = new Set<string>();

    tweets.forEach(tweet => {
      // Extract from context annotations (Twitter's automatic topic classification)
      if (tweet.context_annotations) {
        tweet.context_annotations.forEach(annotation => {
          if (annotation.domain.name && annotation.entity.name) {
            topics.add(annotation.entity.name.toLowerCase());
          }
        });
      }

      // Extract hashtags as topics
      const hashtags = tweet.text.match(/#(\w+)/g);
      if (hashtags) {
        hashtags.forEach(hashtag => {
          topics.add(hashtag.substring(1).toLowerCase());
        });
      }
    });

    return Array.from(topics).slice(0, 20); // Return top 20 topics
  }

  private analyzeEngagementPatterns(tweets: TwitterTweet[]) {
    if (tweets.length === 0) {
      return {
        avgLikes: 0,
        avgRetweets: 0,
        avgReplies: 0,
        bestPerformingTweets: []
      };
    }

    const totalLikes = tweets.reduce((sum, tweet) => sum + tweet.public_metrics.like_count, 0);
    const totalRetweets = tweets.reduce((sum, tweet) => sum + tweet.public_metrics.retweet_count, 0);
    const totalReplies = tweets.reduce((sum, tweet) => sum + tweet.public_metrics.reply_count, 0);

    const avgLikes = Math.round(totalLikes / tweets.length);
    const avgRetweets = Math.round(totalRetweets / tweets.length);
    const avgReplies = Math.round(totalReplies / tweets.length);

    // Find best performing tweets (top 20% by total engagement)
    const tweetsWithEngagement = tweets.map(tweet => ({
      ...tweet,
      totalEngagement: tweet.public_metrics.like_count + 
                      tweet.public_metrics.retweet_count + 
                      tweet.public_metrics.reply_count
    }));

    const bestPerformingTweets = tweetsWithEngagement
      .sort((a, b) => b.totalEngagement - a.totalEngagement)
      .slice(0, Math.max(1, Math.floor(tweets.length * 0.2)))
      .map(({ totalEngagement, ...tweet }) => tweet);

    return {
      avgLikes,
      avgRetweets,
      avgReplies,
      bestPerformingTweets
    };
  }

  private generateTopicSuggestions(analysis: TwitterUserAnalysis) {
    const { topicInterests, writingStyle, engagementPatterns } = analysis;
    
    // Create topic suggestions based on interests and writing style
    const suggestions: Array<{
      name: string;
      keywords: string[];
      hashtags: string[];
      confidence: number;
      reason: string;
    }> = [];

    // Technology topics
    const techTerms = topicInterests.filter(topic => 
      ['technology', 'tech', 'ai', 'artificial intelligence', 'software', 'programming', 'development', 'coding', 'data', 'machine learning'].includes(topic.toLowerCase())
    );
    if (techTerms.length > 0 || writingStyle.tone === 'technical') {
      suggestions.push({
        name: 'Technology & AI',
        keywords: ['artificial intelligence', 'machine learning', 'technology', 'software development', 'programming'],
        hashtags: ['#AI', '#Tech', '#MachineLearning', '#Software', '#Innovation'],
        confidence: Math.min(0.9, 0.6 + (techTerms.length * 0.1)),
        reason: techTerms.length > 0 ? 'Based on your frequent tech-related posts' : 'Matches your technical writing style'
      });
    }

    // Business/Professional topics
    const businessTerms = topicInterests.filter(topic => 
      ['business', 'startup', 'entrepreneurship', 'leadership', 'strategy', 'marketing', 'growth'].includes(topic.toLowerCase())
    );
    if (businessTerms.length > 0 || writingStyle.tone === 'professional') {
      suggestions.push({
        name: 'Business & Startups',
        keywords: ['startup', 'entrepreneurship', 'business strategy', 'leadership', 'growth'],
        hashtags: ['#Startup', '#Business', '#Entrepreneurship', '#Leadership', '#Growth'],
        confidence: Math.min(0.9, 0.6 + (businessTerms.length * 0.1)),
        reason: businessTerms.length > 0 ? 'Based on your business-focused content' : 'Matches your professional tone'
      });
    }

    // Industry-specific suggestions based on common words
    const industryKeywords = writingStyle.commonWords.filter(word => 
      ['finance', 'fintech', 'healthcare', 'education', 'marketing', 'design', 'crypto', 'blockchain'].includes(word)
    );
    if (industryKeywords.length > 0) {
      const primaryIndustry = industryKeywords[0];
      suggestions.push({
        name: `${primaryIndustry.charAt(0).toUpperCase() + primaryIndustry.slice(1)} Industry`,
        keywords: [primaryIndustry, `${primaryIndustry} trends`, `${primaryIndustry} news`],
        hashtags: [`#${primaryIndustry.charAt(0).toUpperCase() + primaryIndustry.slice(1)}`],
        confidence: 0.7,
        reason: `Frequently mentions ${primaryIndustry} in your posts`
      });
    }

    // General interests based on high-frequency topics
    const topTopics = topicInterests.slice(0, 5);
    if (topTopics.length > 0 && suggestions.length < 3) {
      suggestions.push({
        name: 'Your Interests',
        keywords: topTopics.slice(0, 5),
        hashtags: topTopics.slice(0, 3).map(topic => `#${topic.charAt(0).toUpperCase() + topic.slice(1)}`),
        confidence: 0.6,
        reason: 'Based on topics you frequently engage with'
      });
    }

    return suggestions.slice(0, 4); // Return top 4 suggestions
  }
}

export default TwitterApiService;
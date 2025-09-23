import { OpenAI } from 'openai';

interface Tweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
  };
  in_reply_to_user_id?: string;
  score?: number;
}

interface FilteredTweet extends Tweet {
  score: number;
}

interface TweetScores {
  score: number;
  reasoning?: string;
}

export class TweetFilter {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  /**
   * Filter tweets for quality and score them for reply worthiness
   */
  async filterForQuality(tweets: Tweet[]): Promise<FilteredTweet[]> {
    // Filter out tweets older than 24 hours
    const recentTweets = tweets.filter(tweet => {
      const hoursSincePost = (Date.now() - new Date(tweet.created_at).getTime()) / (1000 * 60 * 60);
      return hoursSincePost <= 24;
    });

    // Filter out junk tweets
    const nonJunkTweets = recentTweets.filter(tweet => this.isNotJunk(tweet));

    // Score tweets in parallel for better performance
    const scoredTweets = await Promise.all(
      nonJunkTweets.map(async (tweet) => ({
        ...tweet,
        score: await this.scoreForReply(tweet)
      }))
    );

    return scoredTweets
      .filter(tweet => tweet.score > 0.5)
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, 10); // Take top 10
  }

  /**
   * Determine if a tweet is junk and should be filtered out
   */
  private isNotJunk(tweet: Tweet): boolean {
    // Filter out very short tweets (likely spam or low quality)
    if (tweet.text.length < 20) {
      return false;
    }

    // Filter out tweets with spam patterns
    if (this.containsSpamPatterns(tweet.text)) {
      return false;
    }

    // Filter out tweets that are mostly links or mentions
    if (this.isMostlyLinksOrMentions(tweet.text)) {
      return false;
    }

    return true;
  }

  /**
   * Score a tweet for reply worthiness (0-100) using AI
   */
  private async scoreForReply(tweet: Tweet): Promise<number> {
    const aiScores = await this.scoreTweet(tweet);
    return Math.round(aiScores.score * 100); // Convert 0-1 to 0-100 scale
  }

  /**
   * Score tweet using OpenAI API for reply worthiness
   */
  private async scoreTweet(tweet: Tweet): Promise<TweetScores> {
    try {
      const hoursSincePost = (Date.now() - new Date(tweet.created_at).getTime()) / (1000 * 60 * 60);
      const totalEngagement = tweet.public_metrics.like_count +
                             tweet.public_metrics.retweet_count +
                             tweet.public_metrics.reply_count;

      const prompt = `
        Analyze this tweet and provide a single reply worthiness score (0-1) considering ALL of these factors:

        1. RECENCY (20% weight): ${hoursSincePost.toFixed(1)} hours old (newer is better, max 24h)
        2. ENGAGEMENT (35% weight): ${tweet.public_metrics.like_count} likes, ${tweet.public_metrics.retweet_count} retweets, ${tweet.public_metrics.reply_count} replies (total: ${totalEngagement})
        3. CONTENT QUALITY (25% weight): thoughtfulness, clarity, professional language, engaging questions
        4. INTERACTION OPPORTUNITY (20% weight): potential for meaningful reply

        Additional context:
        - Tweet text: "${tweet.text}"
        - Character count: ${tweet.text.length}
        - Is a reply: ${tweet.in_reply_to_user_id ? 'Yes' : 'No'}
        - Sweet spot for engagement is 5-50 total interactions
        - Original posts (not replies) are preferred

        Return ONLY a JSON object with a combined score considering all weights:
        {"score": 0.75, "reasoning": "Brief explanation"}
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a social media analyst expert at identifying high-value tweets for engagement. Provide a single weighted score as requested in JSON format only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 100,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Clean the content - remove markdown code blocks if present
      const cleanContent = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      const result = JSON.parse(cleanContent) as TweetScores;

      // Validate score is in range
      result.score = Math.max(0, Math.min(1, result.score));

      console.log('Tweet:', tweet);
      console.log('Score:', result.score);
      console.log('Reasoning:', result.reasoning);

      return result;
    } catch (error) {
      console.error('Error scoring tweet with AI:', error);
      // Fallback to default score if AI fails
      return {
        score: 0.5,
        reasoning: 'Fallback score due to AI error'
      };
    }
  }

  /**
   * Check for spam patterns in tweet text
   */
  private containsSpamPatterns(text: string): boolean {
    const spamPatterns = [
      /\b(buy now|click here|free money|get rich|make \$\d+)\b/i,
      /\b(follow for follow|f4f|follow back)\b/i,
      /\b(dm me|direct message)\b/i,
      /(🚀){3,}|(\$){3,}|(💰){3,}/,
      /\b(crypto|bitcoin|nft).*(moon|pump|dump|hodl)\b/i
    ];

    return spamPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Check if tweet is mostly links or mentions
   */
  private isMostlyLinksOrMentions(text: string): boolean {
    const words = text.split(/\s+/);
    const linkCount = (text.match(/https?:\/\/\S+/g) || []).length;
    const mentionCount = (text.match(/@\w+/g) || []).length;
    
    // If more than half the words are links or mentions, consider it spam-like
    return (linkCount + mentionCount) > words.length * 0.5;
  }


  /**
   * Get statistics about filtering results
   */
  getFilterStats(originalTweets: Tweet[], filteredTweets: FilteredTweet[]): {
    totalInput: number;
    filtered: number;
    filterRate: number;
    averageScore: number;
  } {
    const averageScore = filteredTweets.length > 0 
      ? filteredTweets.reduce((sum, t) => sum + t.score, 0) / filteredTweets.length 
      : 0;

    return {
      totalInput: originalTweets.length,
      filtered: filteredTweets.length,
      filterRate: originalTweets.length > 0 ? filteredTweets.length / originalTweets.length : 0,
      averageScore: Math.round(averageScore)
    };
  }
}

// Export singleton instance
export const tweetFilter = new TweetFilter();
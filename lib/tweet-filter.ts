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

export class TweetFilter {
  
  /**
   * Filter tweets for quality and score them for reply worthiness
   */
  filterForQuality(tweets: Tweet[]): FilteredTweet[] {
    return tweets
      .filter(tweet => this.isNotJunk(tweet))
      .map(tweet => ({
        ...tweet,
        score: this.scoreForReply(tweet)
      }))
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, 10); // Take top 10
  }

  /**
   * Determine if a tweet is junk and should be filtered out
   */
  private isNotJunk(tweet: Tweet): boolean {
    // Filter out tweets that are too old (> 24 hours)
    const hoursSincePost = (Date.now() - new Date(tweet.created_at).getTime()) / (1000 * 60 * 60);
    if (hoursSincePost > 24) {
      return false;
    }

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
   * Score a tweet for reply worthiness (0-100)
   */
  private scoreForReply(tweet: Tweet): number {
    let score = 0;

    // Recency score (25% weight) - newer is better
    const hoursSincePost = (Date.now() - new Date(tweet.created_at).getTime()) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, (24 - hoursSincePost) / 24) * 25;
    score += recencyScore;

    // Engagement score (35% weight)
    const engagement = tweet.public_metrics.like_count + 
                      tweet.public_metrics.retweet_count * 2 + 
                      tweet.public_metrics.reply_count * 1.5;
    const engagementScore = Math.min(engagement / 100, 1) * 35;
    score += engagementScore;

    // Content quality score (20% weight)
    score += this.scoreContentQuality(tweet.text) * 20;

    // Interaction opportunity score (20% weight)
    score += this.scoreInteractionOpportunity(tweet) * 20;

    return Math.round(score);
  }

  /**
   * Score content quality based on text characteristics
   */
  private scoreContentQuality(text: string): number {
    let quality = 0.5; // Base score

    // Questions get bonus (encourage engagement)
    if (text.includes('?')) {
      quality += 0.3;
    }

    // Thoughtful content indicators
    const thoughtfulWords = [
      'think', 'believe', 'opinion', 'experience', 'learn', 'discover',
      'insight', 'strategy', 'approach', 'solution', 'challenge'
    ];
    const thoughtfulCount = thoughtfulWords.filter(word => 
      text.toLowerCase().includes(word)
    ).length;
    quality += Math.min(thoughtfulCount * 0.1, 0.3);

    // Professional language gets slight bonus
    if (this.containsProfessionalLanguage(text)) {
      quality += 0.1;
    }

    // Penalty for excessive caps or exclamation
    if (text.toUpperCase() === text || text.split('!').length > 3) {
      quality -= 0.2;
    }

    return Math.max(0, Math.min(1, quality));
  }

  /**
   * Score interaction opportunity
   */
  private scoreInteractionOpportunity(tweet: Tweet): number {
    let opportunity = 0.5; // Base score

    // Original posts (not replies) get bonus
    if (!tweet.in_reply_to_user_id) {
      opportunity += 0.3;
    }

    // Moderate engagement is good (not too high to be overwhelming)
    const totalEngagement = tweet.public_metrics.like_count + 
                           tweet.public_metrics.retweet_count + 
                           tweet.public_metrics.reply_count;
    
    if (totalEngagement >= 5 && totalEngagement <= 50) {
      opportunity += 0.2; // Sweet spot for engagement
    } else if (totalEngagement > 100) {
      opportunity -= 0.1; // Too much activity, hard to get noticed
    }

    // Length bonus for substantial content
    if (tweet.text.length > 100 && tweet.text.length < 250) {
      opportunity += 0.1;
    }

    return Math.max(0, Math.min(1, opportunity));
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
   * Check for professional language
   */
  private containsProfessionalLanguage(text: string): boolean {
    const professionalWords = [
      'strategy', 'analysis', 'business', 'market', 'industry', 'innovation',
      'technology', 'development', 'research', 'insights', 'professional',
      'expertise', 'leadership', 'management', 'growth', 'optimization'
    ];

    return professionalWords.some(word => 
      text.toLowerCase().includes(word)
    );
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
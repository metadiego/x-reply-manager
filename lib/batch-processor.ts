import { createServiceClient } from '@/lib/supabase/server';
import { SearchBroker } from './search-broker';
import { TweetFilter } from './tweet-filter';
import { ReplyGenerator } from './reply-generator';

interface EligibleUser {
  user_id: string;
  replies_left_today: number;
  current_target_index: number;
  fetch_size: number;
  successful_fetch_rate: number;
  last_served_at: string | null;
}

interface MonitoringTarget {
  id: string;
  name: string;
  status: string;
  topic_targets: {
    id: string;
    keywords: string[];
    hashtags: string[];
    exclude_keywords: string[];
    min_engagement: number;
    languages: string[];
  };
}

interface ProcessingResult {
  userId: string;
  targetId: string;
  tweetsProcessed: number;
  repliesGenerated: number;
  cacheHit: boolean;
  error?: string;
}

interface BatchProcessingStats {
  usersProcessed: number;
  totalTweets: number;
  totalReplies: number;
  cacheHitRate: number;
  errors: string[];
}

export class BatchProcessor {
  private searchBroker: SearchBroker;
  private tweetFilter: TweetFilter;
  private replyGenerator: ReplyGenerator;
  private processingStats: BatchProcessingStats;

  constructor() {
    this.searchBroker = new SearchBroker();
    this.tweetFilter = new TweetFilter();
    this.replyGenerator = new ReplyGenerator();
    this.processingStats = {
      usersProcessed: 0,
      totalTweets: 0,
      totalReplies: 0,
      cacheHitRate: 0,
      errors: []
    };
  }

  /**
   * Select users eligible for processing based on quotas and cooldown
   */
  async selectEligibleUsers(limit: number = 10): Promise<EligibleUser[]> {
    try {
      const supabase = createServiceClient();
      
      // Calculate cutoff time for cooldown (15 minutes ago)
      const cooldownCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      
      const { data: users, error } = await supabase
        .from('user_processing_state')
        .select(`
          user_id,
          replies_left_today,
          current_target_index,
          fetch_size,
          successful_fetch_rate,
          last_served_at
        `)
        .gt('replies_left_today', 0) // Must have replies left
        .or(`last_served_at.is.null,last_served_at.lt.${cooldownCutoff}`) // Cooldown check
        .order('last_served_at', { ascending: true, nullsFirst: true }) // FIFO with nulls first
        .limit(limit);

      if (error) {
        console.error('Error selecting eligible users:', error);
        return [];
      }

      // Filter users who actually have active monitoring targets
      const usersWithTargets = [];
      for (const user of users || []) {
        const hasActiveTargets = await this.userHasActiveTargets(user.user_id);
        if (hasActiveTargets) {
          usersWithTargets.push(user);
        }
      }

      console.log(`BatchProcessor: Selected ${usersWithTargets.length} eligible users from ${users?.length || 0} candidates`);
      return usersWithTargets;
    } catch (error) {
      console.error('Error in selectEligibleUsers:', error);
      return [];
    }
  }

  /**
   * Check if user has active monitoring targets
   */
  private async userHasActiveTargets(userId: string): Promise<boolean> {
    try {
      const supabase = createServiceClient();
      
      const { count, error } = await supabase
        .from('monitoring_targets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) {
        console.error(`Error checking targets for user ${userId}:`, error);
        return false;
      }

      return (count || 0) > 0;
    } catch (error) {
      console.error(`Error in userHasActiveTargets for ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get user's active monitoring targets
   */
  private async getUserTargets(userId: string): Promise<MonitoringTarget[]> {
    try {
      const supabase = createServiceClient();
      
      const { data: targets, error } = await supabase
        .from('monitoring_targets')
        .select(`
          id,
          name,
          status,
          topic_targets (
            id,
            keywords,
            hashtags,
            exclude_keywords,
            min_engagement,
            languages
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (error) {
        console.error(`Error fetching targets for user ${userId}:`, error);
        return [];
      }

      return targets || [];
    } catch (error) {
      console.error(`Error in getUserTargets for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Process a single user - core of the batch processing logic
   */
  async processUser(userId: string): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      userId,
      targetId: '',
      tweetsProcessed: 0,
      repliesGenerated: 0,
      cacheHit: false
    };

    try {
      console.log(`BatchProcessor: Processing user ${userId}`);
      
      // Get user's processing state
      const userState = await this.getUserState(userId);
      if (!userState || userState.replies_left_today <= 0) {
        result.error = 'No replies left today';
        return result;
      }

      // Get user's active targets
      const targets = await this.getUserTargets(userId);
      if (targets.length === 0) {
        result.error = 'No active monitoring targets';
        return result;
      }

      // Round-robin: select next target
      const targetIndex = userState.current_target_index % targets.length;
      const currentTarget = targets[targetIndex];
      const topicConfig = currentTarget.topic_targets;
      
      if (!topicConfig) {
        result.error = 'Target has no topic configuration';
        return result;
      }

      result.targetId = currentTarget.id;
      
      console.log(`BatchProcessor: User ${userId} processing target "${currentTarget.name}" (${targetIndex + 1}/${targets.length})`);

      // Add monitoring_target_id to topicConfig for SearchBroker
      const topicConfigWithTargetId = {
        ...topicConfig,
        monitoring_target_id: currentTarget.id
      };

      // Fetch tweets via Search Broker
      // const cacheStatsBefore = this.searchBroker.getCacheStats();
      const tweets = await this.searchBroker.fetchTweets(topicConfigWithTargetId, userState.fetch_size);
      // const cacheStatsAfter = this.searchBroker.getCacheStats();
      
      // result.cacheHit = cacheStatsAfter.hits > cacheStatsBefore.hits;
      result.tweetsProcessed = tweets.length;

      // Filter tweets for quality
      const filteredTweets = await this.tweetFilter.filterForQuality(tweets);
      console.log(`BatchProcessor: Filtered ${tweets.length} tweets to ${filteredTweets.length} quality tweets`);

      // Take up to user's remaining quota
      const tweetsToProcess = filteredTweets.slice(0, userState.replies_left_today);

      // Store curated posts and generate replies
      if (tweetsToProcess.length > 0) {
        // Store the curated posts and get their IDs
        const curatedPostIds = await this.storeCuratedPosts(userId, tweetsToProcess, currentTarget.id);

        // Generate AI replies for the curated posts
        const generatedReplies = await this.replyGenerator.generateRepliesForPosts(
          userId,
          tweetsToProcess,
          curatedPostIds
        );

        result.repliesGenerated = generatedReplies.length;
        console.log(`BatchProcessor: Generated ${generatedReplies.length} replies for user ${userId}`);
      }



      // TODO: we need to check logic for increasing/decreasing fetch size.
      // TODO: we need to check logic for updating the user state.

      // Update user processing state
      await this.updateUserState(userId, {
        current_target_index: targetIndex + 1,
        last_served_at: new Date().toISOString(),
        replies_left_today: userState.replies_left_today - tweetsToProcess.length,
        fetch_size: this.adaptFetchSize(userState, filteredTweets.length)
      });

      // TODO: we need to check logic for updating the target stats.

      // Update target tracking
      await this.updateTargetStats(currentTarget.id, tweets.length, filteredTweets.length);

      console.log(`BatchProcessor: User ${userId} processed ${tweetsToProcess.length} tweets, ${userState.replies_left_today - tweetsToProcess.length} replies remaining`);
      
      return result;
    } catch (error: any) {
      console.error(`BatchProcessor: Error processing user ${userId}:`, error);
      result.error = error.message;
      return result;
    }
  }

  /**
   * Get user's current processing state
   */
  private async getUserState(userId: string): Promise<EligibleUser | null> {
    try {
      const supabase = createServiceClient();
      
      const { data, error } = await supabase
        .from('user_processing_state')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        console.error(`Error fetching user state for ${userId}:`, error);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`Error in getUserState for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Update user's processing state
   */
  private async updateUserState(userId: string, updates: Partial<EligibleUser>): Promise<void> {
    try {
      const supabase = createServiceClient();
      
      const { error } = await supabase
        .from('user_processing_state')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error(`Error updating user state for ${userId}:`, error);
      }
    } catch (error) {
      console.error(`Error in updateUserState for ${userId}:`, error);
    }
  }

  /**
   * Adapt fetch size based on success rate
   */
  private adaptFetchSize(userState: EligibleUser, foundCount: number): number {
    const currentSize = userState.fetch_size;
    const successRate = foundCount / currentSize;
    
    // Update success rate with exponential moving average
    const newSuccessRate = userState.successful_fetch_rate * 0.7 + successRate * 0.3;
    
    // Adapt fetch size based on success rate
    // Twitter API requires max_results between 10 and 100
    let newSize = currentSize;
    if (newSuccessRate < 0.3) {
      // Low success rate - increase fetch size
      newSize = Math.min(currentSize + 5, 50); // Increased to 50 max for better coverage
    } else if (newSuccessRate > 0.7) {
      // High success rate - can decrease fetch size
      newSize = Math.max(currentSize - 2, 10); // Minimum 10 per Twitter API requirements
    }
    
    console.log(`BatchProcessor: Adapted fetch size from ${currentSize} to ${newSize} (success rate: ${Math.round(newSuccessRate * 100)}%)`);
    return newSize;
  }

  /**
   * Store curated posts for reply generation
   * Returns array of created post IDs
   */
  private async storeCuratedPosts(userId: string, tweets: any[], targetId: string): Promise<string[]> {
    try {
      const supabase = createServiceClient();
      
      const curatedPosts = tweets.map(tweet => ({
        user_id: userId,
        monitoring_target_id: targetId,
        twitter_post_id: tweet.id,
        post_content: tweet.text,
        post_author_handle: tweet.author_id, // We'd need to resolve this to handle
        post_author_id: tweet.author_id,
        post_url: `https://twitter.com/i/status/${tweet.id}`,
        post_created_at: tweet.created_at,
        relevance_score: tweet.score || 0.5,
        engagement_score: this.calculateEngagementScore(tweet),
        relationship_score: 0.5, // TODO: Calculate based on author relationship
        total_score: tweet.score || 0.5,
        selection_reason: 'Matched topic keywords/hashtags',
        digest_date: new Date().toISOString().split('T')[0] // Today's date
      }));

      const { data, error } = await supabase
        .from('curated_posts')
        .insert(curatedPosts)
        .select('id');

      if (error) {
        console.error('Error storing curated posts:', error);
        return [];
      } else {
        console.log(`BatchProcessor: Stored ${curatedPosts.length} curated posts for user ${userId}`);
        return data.map(post => post.id);
      }
    } catch (error) {
      console.error('Error in storeCuratedPosts:', error);
      return [];
    }
  }

  /**
   * Calculate engagement score for a tweet
   */
  private calculateEngagementScore(tweet: any): number {
    const metrics = tweet.public_metrics || {};
    const total = (metrics.like_count || 0) + 
                  (metrics.retweet_count || 0) * 2 + 
                  (metrics.reply_count || 0) * 1.5;
    
    // Normalize to 0-1 scale (log scale for better distribution)
    return Math.min(Math.log(total + 1) / Math.log(1000), 1);
  }

  /**
   * Update target processing statistics
   */
  private async updateTargetStats(targetId: string, totalFetched: number, qualityCount: number): Promise<void> {
    try {
      const supabase = createServiceClient();
      
      const { error } = await supabase
        .from('monitoring_targets')
        .update({
          last_fetched_at: new Date().toISOString(),
          fetch_count_today: qualityCount, // Increment would be better but this is simpler
          total_fetches: totalFetched, // This should be incremented too
          updated_at: new Date().toISOString()
        })
        .eq('id', targetId);

      if (error) {
        console.error(`Error updating target stats for ${targetId}:`, error);
      }
    } catch (error) {
      console.error(`Error in updateTargetStats for ${targetId}:`, error);
    }
  }

  /**
   * Process a batch of users
   */
  async processBatch(batchSize: number = 10): Promise<BatchProcessingStats> {
    console.log(`BatchProcessor: Starting batch processing (size: ${batchSize})`);
    
    // Reset stats for this batch
    this.processingStats = {
      usersProcessed: 0,
      totalTweets: 0,
      totalReplies: 0,
      cacheHitRate: 0,
      errors: []
    };

    // Select eligible users
    const users = await this.selectEligibleUsers(batchSize);
    
    if (users.length === 0) {
      console.log('BatchProcessor: No eligible users found');
      return this.processingStats;
    }

    console.log(`BatchProcessor: Processing ${users.length} users`);

    // Process each user
    const results: ProcessingResult[] = [];
    for (const user of users) {
      const result = await this.processUser(user.user_id);
      results.push(result);
      
      if (result.error) {
        this.processingStats.errors.push(`User ${user.user_id}: ${result.error}`);
      } else {
        this.processingStats.usersProcessed++;
        this.processingStats.totalTweets += result.tweetsProcessed;
        this.processingStats.totalReplies += result.repliesGenerated;
      }
    }

    // Calculate cache hit rate
    const cacheStats = this.searchBroker.getCacheStats();
    this.processingStats.cacheHitRate = cacheStats.hitRate;

    console.log(`BatchProcessor: Batch complete - ${this.processingStats.usersProcessed} users, ${this.processingStats.totalTweets} tweets, ${this.processingStats.totalReplies} replies, ${Math.round(this.processingStats.cacheHitRate * 100)}% cache hit rate`);

    return this.processingStats;
  }

  /**
   * Get current processing statistics
   */
  getStats(): BatchProcessingStats {
    return { ...this.processingStats };
  }
}

// Export singleton instance
export const batchProcessor = new BatchProcessor();
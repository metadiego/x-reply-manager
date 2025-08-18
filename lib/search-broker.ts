import { createServiceClient } from '@/lib/supabase/server';
import { TwitterApiService } from './twitter-api';

interface TopicTarget {
  id: string;
  monitoring_target_id: string;
  keywords: string[];
  hashtags: string[];
  exclude_keywords: string[];
  min_engagement: number;
  languages: string[];
}

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
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
}

export class SearchBroker {
  private stats: CacheStats = { hits: 0, misses: 0, hitRate: 0 };

  /**
   * Build Twitter search query from topic target configuration
   */
  buildQuery(target: TopicTarget): string {
    const parts = [];
    
    // Build main search terms (keywords and hashtags combined with OR)
    const searchTerms = [];
    
    // Add keywords (wrapped in quotes for exact matching)
    if (target.keywords?.length) {
      target.keywords.forEach(k => {
        // Only wrap in quotes if it contains spaces (phrase search)
        if (k.includes(' ')) {
          searchTerms.push(`"${k}"`);
        } else {
          searchTerms.push(k);
        }
      });
    }
    
    // Add hashtags
    if (target.hashtags?.length) {
      target.hashtags.forEach(h => {
        // Ensure hashtag starts with #
        searchTerms.push(h.startsWith('#') ? h : `#${h}`);
      });
    }
    
    // Combine all search terms with OR
    if (searchTerms.length > 0) {
      if (searchTerms.length === 1) {
        parts.push(searchTerms[0]);
      } else {
        parts.push(`(${searchTerms.join(' OR ')})`);
      }
    }
    
    // Add exclusions
    if (target.exclude_keywords?.length) {
      target.exclude_keywords.forEach(k => {
        // Wrap in quotes if it contains spaces
        if (k.includes(' ')) {
          parts.push(`-"${k}"`);
        } else {
          parts.push(`-${k}`);
        }
      });
    }
    
    // Add standard filters
    parts.push('-is:retweet'); // No retweets
    parts.push('-is:reply'); // No replies (focus on original content)
    parts.push('lang:en'); // English only
    
    const query = parts.join(' ');
    console.log(`SearchBroker: Built query: "${query}"`);
    return query;
  }

  /**
   * Canonicalize query for consistent caching
   * Normalizes query string to ensure cache hits for similar queries
   */
  private canonicalize(query: string): string {
    // For Twitter queries, we need to preserve the structure
    // Just normalize case and whitespace, don't reorder
    return query
      .toLowerCase()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Check if we have cached results for this query
   */
  private async getCached(canonicalQuery: string): Promise<Tweet[] | null> {
    try {
      const supabase = createServiceClient();
      
      const { data, error } = await supabase
        .from('search_cache')
        .select('raw_results, result_count')
        .eq('canonical_query', canonicalQuery)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return null;
      }

      // Return the cached tweets
      return data.raw_results as Tweet[];
    } catch (error) {
      console.error('Error checking cache:', error);
      return null;
    }
  }

  /**
   * Cache search results for future use
   */
  private async cacheResults(canonicalQuery: string, tweets: Tweet[]): Promise<void> {
    console.log('SearchBroker: Caching results:', tweets);
    try {
      const supabase = createServiceClient();
      
      await supabase
        .from('search_cache')
        .upsert({
          canonical_query: canonicalQuery,
          query_type: 'combined',
          raw_results: tweets,
          result_count: tweets.length,
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
        }, {
          onConflict: 'canonical_query,query_type'
        });
      console.log('SearchBroker: Cached results');
    } catch (error) {
      console.error('Error caching results:', error);
      // Don't throw - caching failure shouldn't break the main flow
    }
  }

  /**
   * Fetch tweets for a topic target with intelligent caching
   */
  async fetchTweets(target: TopicTarget, maxResults: number = 10): Promise<Tweet[]> {
    const query = this.buildQuery(target);
    const canonical = this.canonicalize(query);
    
    console.log(`SearchBroker: Processing query for target "${target.monitoring_target_id}"`);
    
    // Check cache first
    const cached = await this.getCached(canonical);
    if (cached) {
      this.stats.hits++;
      this.updateHitRate();
      console.log(`SearchBroker: Cache HIT for query (${cached.length} tweets)`);
      return cached.slice(0, maxResults);
    }
    
    // Cache miss - fetch from Twitter API
    this.stats.misses++;
    this.updateHitRate();
    console.log(`SearchBroker: Cache MISS, fetching from Twitter API`);
    
    try {
      const twitterApi = TwitterApiService.createAppOnlyService();
      const tweets = await twitterApi.searchTweets(query, {
        maxResults
      });

      console.log('SearchBroker: Tweets:', tweets);
      
      // Cache the results for other users
      await this.cacheResults(canonical, tweets);
      
      console.log(`SearchBroker: Fetched ${tweets.length} tweets from Twitter API`);
      return tweets.slice(0, maxResults);
    } catch (error) {
      console.error('SearchBroker: Error fetching from Twitter API:', error);
      throw error;
    }
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics (useful for testing)
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, hitRate: 0 };
  }

  /**
   * Clean expired cache entries
   * This should be called periodically to keep the cache table manageable
   */
  async cleanExpiredCache(): Promise<number> {
    try {
      const supabase = createServiceClient();
      
      const { error } = await supabase
        .from('search_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());
      
      if (error) {
        console.error('Error cleaning expired cache:', error);
        return 0;
      }
      
      console.log('SearchBroker: Cleaned expired cache entries');
      return 1; // Supabase doesn't return count, but operation succeeded
    } catch (error) {
      console.error('Error in cleanExpiredCache:', error);
      return 0;
    }
  }

  /**
   * Get cache hit rate as percentage
   */
  getCacheHitRate(): number {
    return Math.round(this.stats.hitRate * 100);
  }
}

// Export a singleton instance
export const searchBroker = new SearchBroker();
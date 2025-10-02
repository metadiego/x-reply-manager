import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import TwitterApiService from '@/lib/twitter-api';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

interface TweetMetricsResponse {
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    impressions: number;
  };
  cached: boolean;
  updatedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const userId = session.user.id;

    const { tweetIds } = await request.json();

    if (!Array.isArray(tweetIds) || tweetIds.length === 0) {
      return NextResponse.json({
        error: 'Tweet IDs array required'
      }, { status: 400 });
    }

    // Limit batch size to prevent abuse
    const limitedIds = tweetIds.slice(0, 50);

    // Get user's Twitter credentials
    const { data: profile, error: profileError } = await supabase
      .from('users_profiles')
      .select('twitter_access_token, twitter_user_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.twitter_access_token) {
      return NextResponse.json({
        error: 'Twitter account not connected'
      }, { status: 400 });
    }

    // Check cached metrics
    const { data: cachedPosts } = await supabase
      .from('curated_posts')
      .select('twitter_post_id, likes_count, retweets_count, replies_count, impressions_count, metrics_updated_at')
      .in('twitter_post_id', limitedIds)
      .eq('user_id', userId);

    const now = Date.now();
    const freshMetrics: Record<string, TweetMetricsResponse> = {};
    const staleIds: string[] = [];

    // Determine which metrics are fresh vs stale
    cachedPosts?.forEach(post => {
      if (post.metrics_updated_at) {
        const age = now - new Date(post.metrics_updated_at).getTime();
        if (age < 5 * 60 * 1000) { // 5 minutes
          freshMetrics[post.twitter_post_id] = {
            metrics: {
              likes: post.likes_count || 0,
              retweets: post.retweets_count || 0,
              replies: post.replies_count || 0,
              impressions: post.impressions_count || 0,
            },
            cached: true,
            updatedAt: post.metrics_updated_at
          };
        } else {
          staleIds.push(post.twitter_post_id);
        }
      } else {
        staleIds.push(post.twitter_post_id);
      }
    });

    // Add IDs not in cache
    limitedIds.forEach(id => {
      if (!freshMetrics[id] && !staleIds.includes(id)) {
        staleIds.push(id);
      }
    });

    // Fetch fresh metrics for stale tweets
    if (staleIds.length > 0) {
      const twitterService = new TwitterApiService(profile.twitter_access_token);
      const tweets = await twitterService.getTweetsMetrics(staleIds);

      // Process and cache fresh metrics
      for (const tweet of tweets) {
        const updatedAt = new Date().toISOString();
        const metrics = {
          likes: tweet.public_metrics.like_count,
          retweets: tweet.public_metrics.retweet_count,
          replies: tweet.public_metrics.reply_count,
          impressions: tweet.public_metrics.impression_count || 0,
        };

        freshMetrics[tweet.id] = {
          metrics,
          cached: false,
          updatedAt
        };

        // Update cache
        await supabase
          .from('curated_posts')
          .update({
            likes_count: metrics.likes,
            retweets_count: metrics.retweets,
            replies_count: metrics.replies,
            impressions_count: metrics.impressions,
            metrics_updated_at: updatedAt
          })
          .eq('twitter_post_id', tweet.id)
          .eq('user_id', userId);
      }
    }

    return NextResponse.json({
      metrics: freshMetrics
    });

  } catch (error: unknown) {
    console.error('Error fetching batch metrics:', error);

    if (error instanceof Error && error.message?.includes('rate limit')) {
      return NextResponse.json({
        error: 'Twitter API rate limit reached'
      }, { status: 429 });
    }

    return NextResponse.json({
      error: 'Failed to fetch metrics'
    }, { status: 500 });
  }
}
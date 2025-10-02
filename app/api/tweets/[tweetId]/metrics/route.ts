import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import TwitterApiService from '@/lib/twitter-api';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';


export async function GET(
  request: NextRequest,
  { params }: { params: { tweetId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const userId = session.user.id;

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

    // Check if we have cached metrics first
    const { data: cachedPost } = await supabase
      .from('curated_posts')
      .select('likes_count, retweets_count, replies_count, impressions_count, metrics_updated_at')
      .eq('twitter_post_id', params.tweetId)
      .eq('user_id', userId)
      .single();

    // If metrics are fresh (less than 5 minutes old), return cached
    if (cachedPost?.metrics_updated_at) {
      const metricsAge = Date.now() - new Date(cachedPost.metrics_updated_at).getTime();
      if (metricsAge < 5 * 60 * 1000) { // 5 minutes
        return NextResponse.json({
          metrics: {
            likes: cachedPost.likes_count || 0,
            retweets: cachedPost.retweets_count || 0,
            replies: cachedPost.replies_count || 0,
            impressions: cachedPost.impressions_count || 0,
          },
          cached: true,
          updatedAt: cachedPost.metrics_updated_at
        });
      }
    }

    // Fetch fresh metrics from Twitter API
    const twitterService = new TwitterApiService(profile.twitter_access_token);
    const tweetMetrics = await twitterService.getTweetMetrics(params.tweetId);

    if (!tweetMetrics) {
      return NextResponse.json({
        error: 'Failed to fetch tweet metrics'
      }, { status: 404 });
    }

    // Update cached metrics in database
    await supabase
      .from('curated_posts')
      .update({
        likes_count: tweetMetrics.public_metrics.like_count,
        retweets_count: tweetMetrics.public_metrics.retweet_count,
        replies_count: tweetMetrics.public_metrics.reply_count,
        impressions_count: tweetMetrics.public_metrics.impression_count || 0,
        metrics_updated_at: new Date().toISOString()
      })
      .eq('twitter_post_id', params.tweetId)
      .eq('user_id', userId);

    return NextResponse.json({
      metrics: {
        likes: tweetMetrics.public_metrics.like_count,
        retweets: tweetMetrics.public_metrics.retweet_count,
        replies: tweetMetrics.public_metrics.reply_count,
        impressions: tweetMetrics.public_metrics.impression_count || 0,
      },
      cached: false,
      updatedAt: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('Error fetching tweet metrics:', error);

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
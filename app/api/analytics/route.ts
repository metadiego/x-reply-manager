import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const userId = session.user.id;

    // Get today's start date (midnight)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Parallel fetch all analytics data
    const [
      // Today's stats
      pendingReviewToday,
      skippedToday,
      acceptedToday,
      pendingGenerationToday,

      // All time stats
      pendingReviewAllTime,
      skippedAllTime,
      acceptedAllTime,

      // Additional stats
      activeTargets,
      recentReplies,
      totalCuratedPosts
    ] = await Promise.all([
      // TODAY'S STATS
      // Pending review today
      supabase
        .from('reply_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'pending')
        .gte('created_at', todayStart.toISOString()),

      // Skipped today
      supabase
        .from('reply_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'skipped')
        .gte('updated_at', todayStart.toISOString()),

      // Accepted/posted today
      supabase
        .from('reply_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'posted')
        .gte('updated_at', todayStart.toISOString()),

      // Pending generation today
      supabase
        .from('curated_posts')
        .select(`
          twitter_post_id,
          reply_suggestions!left(id)
        `, { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('reply_suggestions.id', null)
        .gte('created_at', todayStart.toISOString()),

      // ALL TIME STATS
      // All pending review
      supabase
        .from('reply_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'pending'),

      // All skipped
      supabase
        .from('reply_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'skipped'),

      // All accepted/posted
      supabase
        .from('reply_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'posted'),

      // ADDITIONAL STATS
      // Active monitoring targets
      supabase
        .from('monitoring_targets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active'),

      // Recent replies (last 7 days)
      supabase
        .from('reply_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

      // Total curated posts
      supabase
        .from('curated_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
    ]);

    // Calculate weekly average
    const weeklyAverage = Math.round((recentReplies.count || 0) / 7);

    // Calculate response rate (accepted / (accepted + skipped))
    const totalResponded = (acceptedAllTime.count || 0) + (skippedAllTime.count || 0);
    const responseRate = totalResponded > 0
      ? Math.round(((acceptedAllTime.count || 0) / totalResponded) * 100)
      : 0;

    const analytics = {
      today: {
        pendingReview: pendingReviewToday.count || 0,
        skipped: skippedToday.count || 0,
        accepted: acceptedToday.count || 0,
        pendingGeneration: pendingGenerationToday.count || 0,
      },
      allTime: {
        pendingReview: pendingReviewAllTime.count || 0,
        skipped: skippedAllTime.count || 0,
        accepted: acceptedAllTime.count || 0,
        totalCuratedPosts: totalCuratedPosts.count || 0,
      },
      metrics: {
        activeTargets: activeTargets.count || 0,
        recentRepliesCount: recentReplies.count || 0,
        weeklyAverage,
        responseRate,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
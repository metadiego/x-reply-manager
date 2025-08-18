import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

const CRON_API_KEY = process.env.CRON_API_KEY;

/**
 * Reset daily quotas and clean cache - called at midnight UTC
 * POST /api/admin/reset-daily
 */
export async function POST(request: NextRequest) {
  try {
    // Verify API key for security
    const apiKey = request.headers.get('X-API-Key');
    if (!CRON_API_KEY || apiKey !== CRON_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🌅 Starting daily reset process');
    
    const supabase = createServiceClient();
    
    // Reset user processing state for new day
    const { error: resetError } = await supabase
      .from('user_processing_state')
      .update({
        replies_left_today: 10, // TODO: Make this based on subscription tier
        daily_replies_generated: 0,
        daily_posts_fetched: 0,
        daily_reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
      })
      .lte('daily_reset_at', new Date().toISOString());

    if (resetError) {
      console.error('Error resetting user processing state:', resetError);
    }

    // Reset monitoring targets daily counters
    const { error: targetsError } = await supabase
      .from('monitoring_targets')
      .update({
        fetch_count_today: 0
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

    if (targetsError) {
      console.error('Error resetting target counters:', targetsError);
    }

    // Clean expired cache entries
    const { error: cacheError } = await supabase
      .from('search_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (cacheError) {
      console.error('Error cleaning expired cache:', cacheError);
    }

    console.log('✅ Daily reset completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Daily reset completed',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error in daily reset:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check reset status
 */
export async function GET() {
  try {
    const supabase = createServiceClient();
    
    // Check when the next reset is due
    const { data, error } = await supabase
      .from('user_processing_state')
      .select('daily_reset_at')
      .order('daily_reset_at', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to check reset status' }, { status: 500 });
    }

    const nextReset = data?.daily_reset_at;
    const now = new Date();
    const resetDue = nextReset ? new Date(nextReset) <= now : false;

    return NextResponse.json({
      nextReset,
      resetDue,
      currentTime: now.toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { BatchProcessor } from '@/lib/batch-processor';

// Daily budget limit in USD
const DAILY_BUDGET_USD = parseFloat(process.env.DAILY_BUDGET_USD || '50');

// Expected API key for cron jobs
const CRON_API_KEY = process.env.CRON_API_KEY;

interface ProcessingResponse {
  success: boolean;
  message: string;
  stats: {
    usersProcessed: number;
    totalTweets: number;
    totalReplies: number;
    cacheHitRate: number;
    budgetUsed: number;
    budgetRemaining: number;
  };
  errors?: string[];
}

/**
 * Main processing endpoint - called by cron/scheduler every few minutes
 * POST /api/run
 */
export async function POST(request: NextRequest): Promise<NextResponse<ProcessingResponse>> {
  try {
    // Verify API key for security
    const apiKey = request.headers.get('CRON-API-Key');
    if (!CRON_API_KEY || apiKey !== CRON_API_KEY) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - Invalid API key',
        stats: {
          usersProcessed: 0,
          totalTweets: 0,
          totalReplies: 0,
          cacheHitRate: 0,
          budgetUsed: 0,
          budgetRemaining: 0
        }
      }, { status: 401 });
    }

    console.log('🚀 Processing batch started');
    
    // Check global daily budget
    const budgetCheck = await checkDailyBudget();
    console.log('Budget check:', budgetCheck);
    if (budgetCheck.exceeded) {
      return NextResponse.json({
        success: false,
        message: `Daily budget of $${DAILY_BUDGET_USD} reached. Spent: $${budgetCheck.spent.toFixed(4)}`,
        stats: {
          usersProcessed: 0,
          totalTweets: 0,
          totalReplies: 0,
          cacheHitRate: 0,
          budgetUsed: budgetCheck.spent,
          budgetRemaining: Math.max(0, DAILY_BUDGET_USD - budgetCheck.spent)
        }
      });
    }

    // Get batch size from query params or default to 10
    const { searchParams } = new URL(request.url);
    const batchSize = parseInt(searchParams.get('batch_size') || '10');
    console.log('Batch size:', batchSize);
    
    // Process the batch
    const processor = new BatchProcessor();
    const batchStats = await processor.processBatch(batchSize);
    console.log('Batch stats:', batchStats);

    // Log API usage for this batch
    await logBatchUsage(batchStats);

    // Calculate estimated cost (very rough estimate)
    const estimatedCost = estimateBatchCost(batchStats);
    
    console.log(`✅ Batch processing complete:`, {
      users: batchStats.usersProcessed,
      tweets: batchStats.totalTweets,
      replies: batchStats.totalReplies,
      cacheHitRate: `${Math.round(batchStats.cacheHitRate * 100)}%`,
      estimatedCost: `$${estimatedCost.toFixed(4)}`
    });

    return NextResponse.json({
      success: true,
      message: `Processed ${batchStats.usersProcessed} users successfully`,
      stats: {
        usersProcessed: batchStats.usersProcessed,
        totalTweets: batchStats.totalTweets,
        totalReplies: batchStats.totalReplies,
        cacheHitRate: Math.round(batchStats.cacheHitRate * 100),
        budgetUsed: budgetCheck.spent + estimatedCost,
        budgetRemaining: Math.max(0, DAILY_BUDGET_USD - budgetCheck.spent - estimatedCost)
      },
      errors: batchStats.errors.length > 0 ? batchStats.errors : undefined
    });

  } catch (error: any) {
    console.error('❌ Error in batch processing:', error);
    
    return NextResponse.json({
      success: false,
      message: `Processing failed: ${error.message}`,
      stats: {
        usersProcessed: 0,
        totalTweets: 0,
        totalReplies: 0,
        cacheHitRate: 0,
        budgetUsed: 0,
        budgetRemaining: DAILY_BUDGET_USD
      },
      errors: [error.message]
    }, { status: 500 });
  }
}

/**
 * Check current daily budget usage
 */
async function checkDailyBudget(): Promise<{ spent: number; exceeded: boolean }> {
  try {
    const supabase = createServiceClient();
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Sum up estimated costs for today
    const { data, error } = await supabase
      .from('api_usage_log')
      .select('estimated_cost_usd')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`);

    if (error) {
      console.error('Error checking daily budget:', error);
      return { spent: 0, exceeded: false };
    }

    const totalSpent = data?.reduce((sum, record) => sum + (record.estimated_cost_usd || 0), 0) || 0;
    const exceeded = totalSpent >= DAILY_BUDGET_USD;

    console.log(`💰 Daily budget check: $${totalSpent.toFixed(4)} / $${DAILY_BUDGET_USD} (${exceeded ? 'EXCEEDED' : 'OK'})`);
    
    return { spent: totalSpent, exceeded };
  } catch (error) {
    console.error('Error in checkDailyBudget:', error);
    return { spent: 0, exceeded: false };
  }
}

/**
 * Log batch usage for cost tracking
 */
async function logBatchUsage(batchStats: any): Promise<void> {
  try {
    const supabase = createServiceClient();
    
    // Create a processing batch record
    const { data: batchRecord, error: batchError } = await supabase
      .from('processing_batches')
      .insert({
        user_id: null, // System batch (null for system operations)
        batch_type: 'scheduled',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        total_posts_fetched: batchStats.totalTweets,
        total_replies_generated: batchStats.totalReplies,
        total_cost_usd: estimateBatchCost(batchStats),
        status: 'completed'
      })
      .select()
      .single();

    if (batchError) {
      console.error('Error logging batch record:', batchError);
    }

    // Log individual API usage
    const { error: usageError } = await supabase
      .from('api_usage_log')
      .insert({
        user_id: null, // System operation (null for system operations)
        operation_type: 'batch_processing',
        posts_fetched: batchStats.totalTweets,
        ai_tokens_used: 0, // TODO: Add when we implement AI reply generation
        estimated_cost_usd: estimateBatchCost(batchStats),
        replies_generated: batchStats.totalReplies
      });

    if (usageError) {
      console.error('Error logging API usage:', usageError);
    }
  } catch (error) {
    console.error('Error in logBatchUsage:', error);
  }
}

/**
 * Estimate cost for a batch (very rough calculation)
 */
function estimateBatchCost(batchStats: any): number {
  // Twitter API v2 pricing (approximate):
  // - Search tweets: ~$0.0133 per 1000 tweets
  // - Cache hits cost nothing
  
  const tweetsActuallyFetched = Math.round(batchStats.totalTweets * (1 - batchStats.cacheHitRate));
  const twitterApiCost = (tweetsActuallyFetched / 1000) * 0.0133;
  
  // TODO: Add OpenAI costs when we implement reply generation
  // const openaiCost = batchStats.totalReplies * 0.001; // ~$0.001 per reply
  
  return twitterApiCost;
}

/**
 * GET endpoint for status checks and manual testing
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const budgetCheck = await checkDailyBudget();
    
    return NextResponse.json({
      status: 'ready',
      dailyBudget: DAILY_BUDGET_USD,
      budgetUsed: budgetCheck.spent,
      budgetRemaining: Math.max(0, DAILY_BUDGET_USD - budgetCheck.spent),
      budgetExceeded: budgetCheck.exceeded,
      message: budgetCheck.exceeded 
        ? 'Daily budget exceeded - processing paused'
        : 'Ready for processing'
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message
    }, { status: 500 });
  }
}
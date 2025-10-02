import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { batchProcessor } from '@/lib/batch-processor';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

interface ProcessUserResponse {
  success: boolean;
  message: string;
  stats?: {
    tweetsProcessed: number;
    repliesGenerated: number;
  };
  error?: string;
}

/**
 * Process tweets for a specific user after onboarding
 * POST /api/process-user
 */
export async function POST(request: NextRequest): Promise<NextResponse<ProcessUserResponse>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized',
        error: 'User not authenticated'
      }, { status: 401 });
    }

    const userId = session.user.id;

    console.log(`Processing tweets for user ${userId} after onboarding completion`);

    // Process the user's tweets
    const result = await batchProcessor.processUser(userId);

    if (result.error) {
      console.error(`Error processing user ${userId}:`, result.error);
      return NextResponse.json({
        success: false,
        message: 'Failed to process tweets',
        error: result.error
      }, { status: 500 });
    }

    console.log(`Successfully processed user ${user.id}: ${result.tweetsProcessed} tweets, ${result.repliesGenerated} replies`);

    return NextResponse.json({
      success: true,
      message: 'Tweets processed successfully',
      stats: {
        tweetsProcessed: result.tweetsProcessed,
        repliesGenerated: result.repliesGenerated
      }
    });

  } catch (error: any) {
    console.error('Error in process-user endpoint:', error);

    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, { status: 500 });
  }
}
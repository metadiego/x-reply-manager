import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TwitterUserAnalysis } from '@/lib/twitter-api';

// Mock OpenAI integration for voice training
// In production, this would use the actual OpenAI API
interface VoiceTrainingResult {
  voiceProfile: {
    tone: string;
    style: string[];
    avgLength: number;
    commonPatterns: string[];
    engagementStyle: string;
  };
  trainingSamples: string[];
  testReplies: Array<{
    originalTweet: string;
    suggestedReply: string;
    confidence: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user authentication using secure getUser()
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the analysis data from request body
    const { analysis }: { analysis: TwitterUserAnalysis } = await request.json();

    if (!analysis) {
      return NextResponse.json({ 
        error: 'Analysis data required. Please run user analysis first.' 
      }, { status: 400 });
    }

    // Generate voice training based on the analysis
    const voiceTraining = await generateVoiceTraining(analysis);

    // Store voice training samples in user profile
    const { error: updateError } = await supabase
      .from('users_profiles')
      .update({
        voice_training_samples: voiceTraining.trainingSamples,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error saving voice training:', updateError);
      return NextResponse.json({ 
        error: 'Failed to save voice training data.' 
      }, { status: 500 });
    }

    // Log API usage (in production this would include OpenAI tokens)
    await supabase
      .from('api_usage_log')
      .insert({
        user_id: user.id,
        operation_type: 'ai_voice_training',
        ai_tokens_used: 1000, // Mock token usage
        estimated_cost_usd: 0.002, // Mock cost
        created_at: new Date().toISOString()
      });

    return NextResponse.json({ 
      success: true, 
      voiceTraining 
    });

  } catch (error: any) {
    console.error('Voice training error:', error);
    return NextResponse.json({ 
      error: 'Failed to train voice model. Please try again.' 
    }, { status: 500 });
  }
}

async function generateVoiceTraining(analysis: TwitterUserAnalysis): Promise<VoiceTrainingResult> {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  const { writingStyle, engagementPatterns, recentTweets } = analysis;

  // Generate voice profile based on analysis
  const voiceProfile = {
    tone: writingStyle.tone,
    style: writingStyle.style,
    avgLength: writingStyle.avgLength,
    commonPatterns: [
      `Uses ${writingStyle.commonWords.slice(0, 3).join(', ')} frequently`,
      `Prefers ${writingStyle.avgLength < 100 ? 'concise' : 'detailed'} responses`,
      `${writingStyle.style.includes('question-asking') ? 'Often asks thoughtful questions' : 'Shares insights and observations'}`,
      `Engagement style: ${engagementPatterns.avgLikes > 10 ? 'high-engagement' : 'thoughtful-interaction'} focused`
    ],
    engagementStyle: determineEngagementStyle(writingStyle, engagementPatterns)
  };

  // Generate training samples (realistic based on analysis)
  const trainingSamples = [
    `Writing tone: ${writingStyle.tone} - ${getToneDescription(writingStyle.tone)}`,
    `Preferred length: ${writingStyle.avgLength} characters (${writingStyle.avgLength < 100 ? 'concise' : writingStyle.avgLength > 200 ? 'detailed' : 'moderate'})`,
    `Common vocabulary: ${writingStyle.commonWords.slice(0, 5).join(', ')}`,
    `Style patterns: ${writingStyle.style.join(', ')}`,
    `Engagement approach: ${voiceProfile.engagementStyle}`
  ];

  // Generate test replies based on best performing tweets
  const testReplies = engagementPatterns.bestPerformingTweets.slice(0, 3).map((tweet, index) => ({
    originalTweet: tweet.text,
    suggestedReply: generateMockReply(tweet.text, writingStyle),
    confidence: 0.85 - (index * 0.05) // Decreasing confidence
  }));

  return {
    voiceProfile,
    trainingSamples,
    testReplies
  };
}

function getToneDescription(tone: string): string {
  const descriptions = {
    professional: 'business-focused, authoritative but approachable',
    technical: 'detail-oriented, uses industry terminology',
    casual: 'conversational, friendly and relaxed',
    friendly: 'warm, engaging, relationship-focused'
  };
  return descriptions[tone as keyof typeof descriptions] || 'conversational and engaging';
}

function determineEngagementStyle(writingStyle: any, engagementPatterns: any): string {
  if (writingStyle.style.includes('question-asking')) {
    return 'curiosity-driven, asks thoughtful questions';
  }
  if (engagementPatterns.avgLikes > 20) {
    return 'value-first, shares actionable insights';
  }
  if (writingStyle.style.includes('thread-creator')) {
    return 'educational, breaks down complex topics';
  }
  return 'supportive, builds on others\' ideas';
}

function generateMockReply(originalTweet: string, writingStyle: any): string {
  // Simple mock reply generation based on writing style
  const tweetLength = originalTweet.length;
  const userAvgLength = writingStyle.avgLength;
  
  // Generate reply style based on user's patterns
  if (writingStyle.style.includes('question-asking')) {
    return "That's an interesting perspective! What's been your experience with implementing this approach?";
  }
  
  if (writingStyle.tone === 'technical') {
    return "Great point. I've found that this approach works particularly well when combined with proper error handling and monitoring.";
  }
  
  if (writingStyle.tone === 'professional') {
    return "Excellent insight. This aligns perfectly with what we're seeing in the industry. Thanks for sharing your experience.";
  }
  
  // Default friendly/casual response
  return "This is really valuable - thanks for sharing! I've been thinking about similar challenges and this gives me some great ideas.";
}
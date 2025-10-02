import { OpenAI } from 'openai';
import { createServiceClient } from '@/lib/supabase/server';

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
  score?: number;
}

interface VoiceProfile {
  samples: string[]
}

interface GeneratedReply {
  content: string;
  confidence: number;
  curatedPostId: string;
  tweetId: string;
}

interface ReplySuggestion {
  id: string;
  curated_post_id: string;
  user_id: string;
  suggested_reply: string;
  status: string;
  created_at: string;
}

export class ReplyGenerator {
  private openai: OpenAI;
  private costPerInputToken = 0.00015 / 1000; // GPT-4o-mini pricing per input token
  private costPerOutputToken = 0.0006 / 1000;  // GPT-4o-mini pricing per output token

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate AI-powered replies for multiple curated posts
   */
  async generateRepliesForPosts(
    userId: string,
    tweets: Tweet[],
    curatedPostIds: string[]
  ): Promise<ReplySuggestion[]> {

    try {
      // Get user's voice profile for personalized replies
      const voiceProfile = await this.getUserVoiceProfile(userId);
      console.log(`ReplyGenerator: Found voice profile for user ${userId}:`, voiceProfile ? 'Yes' : 'No');

      // Generate replies in parallel for better performance
      const replyPromises = tweets.map(async (tweet, index) => {
        const curatedPostId = curatedPostIds[index];
        if (!curatedPostId) return null;

        try {
          const reply = await this.generateSingleReply(tweet, voiceProfile);
          if (reply) {
            // Store the generated reply
            const storedReply = await this.storeReplySuggestion({
              userId,
              curatedPostId,
              tweetId: tweet.id,
              replyContent: reply.content,
              confidence: reply.confidence
            });
            return storedReply;
          }
        } catch (error) {
          console.error(`Error generating reply for tweet ${tweet.id}:`, error);
          return null;
        }
      });

      const replies = await Promise.all(replyPromises);
      const validReplies = replies.filter((reply): reply is ReplySuggestion => reply !== null);

      console.log('Replies:', replies);

      console.log(`ReplyGenerator: Generated ${validReplies.length} replies for user ${userId}`);
      return validReplies;
    } catch (error) {
      console.error('Error in generateRepliesForPosts:', error);
      return [];
    }
  }

  /**
   * Generate a single AI-powered reply for a tweet
   */
  private async generateSingleReply(
    tweet: Tweet,
    voiceProfile: VoiceProfile | null
  ): Promise<GeneratedReply | null> {
    try {
      const prompt = `
        You are a social media expert helping to craft an engaging reply to a tweet.

        'Voice samples: '${ voiceProfile?.samples}

        Original Tweet: "${tweet.text}"
        Tweet Metrics: ${tweet.public_metrics.like_count} likes, ${tweet.public_metrics.retweet_count} retweets, ${tweet.public_metrics.reply_count} replies
        Tweet Score: ${tweet.score ? (tweet.score * 100).toFixed(0) : 'N/A'}/100

        Guidelines:
        - Be authentic and conversational
        - Add value through insights, questions, or support
        - Keep it concise (ideally under 200 characters, max 280)
        - Avoid being promotional or spammy
        - Match the tone and context of the original tweet
        - Be relevant and on-topic
        - If the tweet asks a question, answer it thoughtfully
        - If it shares information, add a meaningful perspective
        - If it's an opinion, engage constructively

        Generate a thoughtful reply and provide a confidence score (0-1) for how well this reply matches the context and would likely get engagement.

        Return ONLY a JSON object:
        {"content": "Your reply here", "confidence": 0.85}
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating engaging, authentic social media replies that spark meaningful conversations. Always return valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 150,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const result = JSON.parse(content);

      // Validate the reply
      if (result.content && result.content.length <= 280) {
        return {
          content: result.content,
          confidence: Math.max(0, Math.min(1, result.confidence || 0.7)),
          curatedPostId: '', // Will be set by caller
          tweetId: tweet.id
        };
      }

      console.warn(`Reply too long or invalid for tweet ${tweet.id}:`, result);
      return null;
    } catch (error) {
      console.error('Error generating single reply:', error);
      return null;
    }
  }

  /**
   * Get user's voice profile for personalized replies
   */
  private async getUserVoiceProfile(userId: string): Promise<VoiceProfile | null> {
    try {
      const supabase = createServiceClient();

      // Try to get the voice profile from the voice_profiles table
      const { data: voiceProfile, error: voiceError } = await supabase
        .from('users_profiles')
        .select('voice_training_samples')
        .eq('id', userId)
        .single();

      if (voiceError) {
        return {
          samples: []
        } as VoiceProfile;
      }

      return {
        samples: voiceProfile?.voice_training_samples || []
      } as VoiceProfile;
    } catch (error) {
      console.error(`Error fetching voice profile for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Store generated reply suggestion in database
   */
  private async storeReplySuggestion(replyData: {
    userId: string;
    curatedPostId: string;
    tweetId: string;
    replyContent: string;
    confidence: number;
  }): Promise<ReplySuggestion | null> {
    try {
      const supabase = createServiceClient();

      const { data, error } = await supabase
        .from('reply_suggestions')
        .insert({
          user_id: replyData.userId,
          curated_post_id: replyData.curatedPostId,
          suggested_reply: replyData.replyContent,
          status: 'pending', // Will be updated when user approves/edits/sends
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error storing reply suggestion:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in storeReplySuggestion:', error);
      return null;
    }
  }

  /**
   * Estimate the cost of generating replies
   * Based on GPT-4o-mini pricing
   */
  estimateCost(numberOfReplies: number): number {
    // Rough estimation:
    // - Average prompt: ~500 tokens
    // - Average response: ~50 tokens
    const avgInputTokensPerReply = 500;
    const avgOutputTokensPerReply = 50;

    const totalInputTokens = numberOfReplies * avgInputTokensPerReply;
    const totalOutputTokens = numberOfReplies * avgOutputTokensPerReply;

    const inputCost = totalInputTokens * this.costPerInputToken;
    const outputCost = totalOutputTokens * this.costPerOutputToken;

    return inputCost + outputCost;
  }

  /**
   * Get actual token usage from the last operation
   * This would need to be enhanced to track actual usage
   */
  getLastOperationTokens(): { input: number; output: number } {
    // TODO: Implement actual token tracking
    return { input: 0, output: 0 };
  }
}

// Export singleton instance
export const replyGenerator = new ReplyGenerator();
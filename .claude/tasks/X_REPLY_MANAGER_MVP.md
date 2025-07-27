# X Reply Manager MVP Development Plan

## Overview
This plan outlines the development of an X (Twitter) Reply Manager MVP based on the requirements document. The application will provide AI-curated daily digests of relevant posts with suggested replies to help professionals maintain consistent engagement on X.

## Technical Architecture

### Tech Stack
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Backend**: Next.js API Routes, Server Actions
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Twitter OAuth
- **Styling**: Tailwind CSS + shadcn/ui components
- **AI Integration**: OpenAI API for reply generation (in API Routes)
- **Twitter Integration**: Twitter API v2 (in API Routes)
- **Scheduling**: External triggers (cron services, GitHub Actions, etc.)
- **Email**: SendGrid/Mailgun for notifications
- **Analytics**: Mixpanel
- **Payments**: RevenueCat

### Next.js API Routes Architecture

**Simplified API Routes for MVP:**
1. **`/api/process/daily-digest`** - Single endpoint for complete daily processing
2. **`/api/digest/send`** - Email digest generation
3. **`/api/admin/reset-limits`** - Daily limit reset (admin endpoint)
4. **`/api/user/onboard`** - User onboarding and setup

**API Authentication & Security:**
- **API Key Authentication**: Secure tokens for external triggers
- **Rate Limiting**: Per-endpoint rate limits using Redis/memory cache
- **Request Validation**: Zod schemas for all inputs
- **Error Handling**: Structured error responses with proper HTTP codes
- **Logging**: Comprehensive request/response logging
- **CORS**: Properly configured for external service calls

**Simplified Processing Flow:**
```
External Trigger (cron service, GitHub Actions)
↓
POST /api/process/daily-digest
{
  "trigger": "scheduled",
  "users": ["user_id"] // optional, processes all if empty
}
↓
For each user (all processing in single function):
  - Check daily limits (from users_profiles table)
  - Fetch posts from all active monitoring targets
  - Apply time decay, relationship, and relevance scoring
  - Generate AI replies with voice training
  - Store curated posts and replies
  - Update daily counters in users_profiles
  - STOP if daily limit reached
↓
Send email digest with results
```

**API Design Principles:**
- **RESTful endpoints** with proper HTTP methods
- **Idempotent operations** for safe retries
- **Atomic transactions** for data consistency
- **Graceful error handling** with detailed error responses
- **Request timeouts** to prevent hanging processes
- **Response caching** where appropriate

### Database Schema Design
```sql
-- Users table (extends Supabase auth.users)
-- Users table (simplified)
users_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  twitter_handle TEXT,
  twitter_user_id TEXT,
  twitter_access_token TEXT ENCRYPTED,
  twitter_refresh_token TEXT ENCRYPTED,
  voice_training_samples TEXT[],
  subscription_tier TEXT DEFAULT 'basic', -- 'basic', 'pro', 'enterprise'
  daily_digest_time TIME DEFAULT '09:00:00',
  timezone TEXT DEFAULT 'UTC',
  daily_posts_fetched INTEGER DEFAULT 0,
  daily_replies_generated INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  voice_training_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User-defined monitoring targets
monitoring_targets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users_profiles(id),
  name TEXT NOT NULL, -- user-friendly name like "AI Industry News"
  target_type TEXT NOT NULL, -- 'topic' or 'twitter_list'
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'archived'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Topic-specific configuration
topic_targets (
  id UUID PRIMARY KEY,
  monitoring_target_id UUID REFERENCES monitoring_targets(id) ON DELETE CASCADE,
  keywords TEXT[], -- ["artificial intelligence", "machine learning"]
  hashtags TEXT[], -- ["#AI", "#MachineLearning", "#ArtificialIntelligence"]
  exclude_keywords TEXT[], -- ["crypto", "bitcoin"] to filter out
  min_engagement INTEGER DEFAULT 0, -- minimum likes + retweets + replies
  languages TEXT[] DEFAULT '{"en"}', -- language codes
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT topic_targets_monitoring_target_unique UNIQUE (monitoring_target_id)
);

-- Twitter list configuration
twitter_list_targets (
  id UUID PRIMARY KEY,
  monitoring_target_id UUID REFERENCES monitoring_targets(id) ON DELETE CASCADE,
  twitter_list_id TEXT NOT NULL, -- Twitter's list ID
  list_name TEXT, -- cached for display
  list_owner_handle TEXT, -- cached for display
  include_retweets BOOLEAN DEFAULT FALSE,
  max_posts_per_day INTEGER DEFAULT 50, -- limit posts from this list
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT twitter_list_targets_monitoring_target_unique UNIQUE (monitoring_target_id)
);

-- Curated posts for daily digests
curated_posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users_profiles(id),
  monitoring_target_id UUID REFERENCES monitoring_targets(id), -- track source
  twitter_post_id TEXT,
  post_content TEXT,
  post_author_handle TEXT,
  post_author_id TEXT,
  post_url TEXT, -- full Twitter URL for easy access
  post_created_at TIMESTAMP, -- when the original post was created
  relevance_score FLOAT,
  engagement_score FLOAT,
  relationship_score FLOAT,
  time_decay_score FLOAT, -- Urgency based on post age
  total_score FLOAT, -- calculated final score
  selection_reason TEXT,
  digest_date DATE,
  reply_urgency TEXT DEFAULT 'medium', -- 'high', 'medium', 'low' based on time decay
  post_context_preview TEXT, -- Rich preview for digest display
  estimated_engagement INTEGER DEFAULT 0, -- Predicted likes/retweets
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI-generated reply suggestions
reply_suggestions (
  id UUID PRIMARY KEY,
  curated_post_id UUID REFERENCES curated_posts(id),
  user_id UUID REFERENCES users_profiles(id),
  suggested_reply TEXT,
  status TEXT, -- 'pending', 'approved', 'edited', 'skipped', 'posted'
  user_edited_reply TEXT,
  scheduled_for TIMESTAMP,
  posted_at TIMESTAMP,
  twitter_reply_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Simplified: Cost tracking moved to user profiles (daily reset via cron)
-- Removed: user_processing_state, api_usage_log, processing_batches tables
-- For MVP: Track usage directly in users_profiles table

-- Relationship tracking for authentic engagement
user_relationships (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users_profiles(id),
  twitter_user_id TEXT NOT NULL, -- Person we're tracking relationship with
  twitter_handle TEXT,
  first_interaction_date DATE DEFAULT CURRENT_DATE,
  last_reply_date DATE,
  total_replies_sent INTEGER DEFAULT 0,
  replies_this_week INTEGER DEFAULT 0,
  connection_strength FLOAT DEFAULT 0.0, -- 0-1 score based on engagement
  replies_received INTEGER DEFAULT 0, -- Did they reply back to us?
  mutual_follows BOOLEAN DEFAULT FALSE,
  notes TEXT, -- User notes about this person
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, twitter_user_id)
);

-- Engagement analytics
engagement_metrics (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users_profiles(id),
  date DATE DEFAULT CURRENT_DATE,
  posts_shown INTEGER DEFAULT 0,
  replies_suggested INTEGER DEFAULT 0,
  replies_approved INTEGER DEFAULT 0,
  replies_posted INTEGER DEFAULT 0,
  replies_received INTEGER DEFAULT 0, -- Responses to our replies
  time_saved_minutes INTEGER DEFAULT 0, -- Estimated time saved
  engagement_score FLOAT DEFAULT 0.0, -- Daily engagement effectiveness
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

```

## Subscription Tiers Definition

### **Basic Tier** ($19/month)
- **Daily Limits**: 5 replies/day, 25 posts fetched/day
- **Features**: 
  - Basic monitoring targets - 1 monitoring target (only topics - no lists)
  - Email digest
  - Basic analytics (last 7 days)
- **Cost Budget**: ~$0.33/day for Twitter API

### **Pro Tier** ($29/month) 
- **Daily Limits**: 15 replies/day, 50 posts fetched/day
- **Features**:
  - Advanced monitoring targets - 3 monitoring targets (topics or lists)
  - Real-time web dashboard
  - Advanced analytics (last 30 days)
  - Relationship tracking and connection strength
  - Custom digest timing
- **Cost Budget**: ~$0.66/day for Twitter API

### **Enterprise Tier** ($89/month)
- **Daily Limits**: 50 replies/day, 100 posts fetched/day  
- **Features**:
  - Unlimited monitoring targets
  - Premium AI with custom prompts
  - Priority processing
  - Full analytics suite with exports
  - Advanced relationship CRM features
  - Team collaboration tools
  - API access
- **Cost Budget**: ~$13.33/day for Twitter API

```

## Development Phases

### Phase 1: Foundation & Authentication
**Tasks:**
1. Set up Next.js 15 project structure with TypeScript
2. Configure Supabase integration
3. Implement Twitter OAuth authentication flow
4. Create basic user profile management
5. Set up database schema and migrations
6. Implement protected route patterns
7. Build monitoring targets onboarding flow
8. Create topic configuration interface
9. Implement Twitter lists discovery and selection

**Deliverables:**
- Users can sign up and authenticate with Twitter
- Complete monitoring targets setup (topics and/or Twitter lists)
- Voice training sample collection interface
- Protected dashboard layout

### Phase 2: Next.js API Routes & Cost Optimization
**Tasks:**
1. Set up Next.js API Routes for backend processing
2. Implement API authentication and security middleware
3. Create Twitter API v2 client wrapper in API routes
4. Build cost-optimized fetch-and-generate pipeline
5. Implement smart batching system for API calls
6. Add usage tracking and cost monitoring
7. Create processing state management
8. Set up external trigger integration (webhooks/cron)
9. Implement monitoring targets management interface
10. Add comprehensive error handling and logging

**Deliverables:**
- Secure Next.js API Routes handling all Twitter API calls
- External trigger-ready endpoints with proper authentication
- Cost-optimized processing pipeline that stops at user reply limits
- Real-time usage tracking and cost monitoring
- External scheduling integration (cron services, GitHub Actions)
- Monitoring targets can be created, edited, paused, and archived
- Backend processing completely separated from frontend
- Production-ready API with proper error handling and validation

### Phase 3: Unified Fetch-and-Generate Pipeline
**Tasks:**
1. Integrate OpenAI API in Next.js API Routes
2. Implement unified processing function (fetch → filter → generate → store)
3. Create smart reply criteria matching system
4. Implement voice modeling based on user samples
5. Build progressive fetching with immediate stopping at limits
6. Add reply quality validation and filtering
7. Create reply editing interface in frontend
8. Implement reply scheduling system
9. Add webhook endpoints for real-time processing updates
10. Implement retry mechanisms and failure handling

**Deliverables:**
- Single API route that efficiently processes all user targets
- Cost-optimized pipeline that generates exactly X replies per user daily
- AI generates contextual replies in user's voice style
- Smart criteria matching prevents unnecessary reply generation
- Users can edit and schedule replies via frontend interface
- Real-time processing state and cost tracking
- Webhook integration for external monitoring and alerting

### Phase 4: Daily Digest System
**Tasks:**
1. Build daily digest generation cron job
2. Create email notification system (SendGrid integration)
3. Design digest email template with post context previews
4. Implement batch reply approval interface
5. Add "explain selection" feature for each post
6. Create scheduling and posting pipeline
7. Add time decay indicators for post urgency
8. Implement relationship tracking to prevent over-replying

**Deliverables:**
- Users receive daily email digests with rich post context
- Web interface for reviewing and approving replies
- Time-sensitive post prioritization
- Relationship-aware reply suggestions
- Automated posting of approved replies

### Phase 5: Analytics & Dashboard
**Tasks:**
1. Build comprehensive analytics dashboard
2. Implement engagement metrics tracking (reply success rates, responses received)
3. Create relationship tracking system (reply frequency per person, connection strength)
4. Add time-saved calculations and ROI metrics
5. Build weekly/monthly summary reports
6. Create user insights and recommendations engine
7. Implement A/B testing for reply effectiveness
8. Add goal tracking and progress visualization

**Deliverables:**
- Complete analytics dashboard showing user engagement metrics
- Relationship tracking with connection strength indicators
- ROI calculations (time saved, engagement generated, relationships built)
- Weekly summary reports with actionable insights
- Goal tracking and progress visualization
- Performance recommendations for improving reply effectiveness

### Phase 6: Subscription & Payments
**Tasks:**
1. Integrate RevenueCat for subscription management
2. Implement usage limits by subscription tier
3. Create subscription management interface
4. Add billing and invoice handling
5. Implement usage tracking and enforcement
6. Create upgrade/downgrade flows

**Deliverables:**
- Working subscription system with three tiers
- Usage enforcement based on subscription level
- Billing management interface

## Key Implementation Details

### API Security & Best Practices

**Authentication System:**
```typescript
// Middleware for API key validation
export function validateApiKey(apiKey: string | null): boolean {
  if (!apiKey) return false;
  
  const validKeys = process.env.API_KEYS?.split(',') || [];
  return validKeys.includes(apiKey);
}

// Rate limiting middleware
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 h'), // 100 requests per hour
});

export async function checkRateLimit(identifier: string) {
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier);
  return { success, limit, reset, remaining };
}
```

**Request Validation:**
```typescript
import { z } from 'zod';

export const ProcessRequestSchema = z.object({
  trigger: z.enum(['scheduled', 'manual', 'test']),
  batch_id: z.string().uuid(),
  users: z.array(z.string().uuid()).optional(),
  priority: z.enum(['high', 'normal', 'low']).default('normal')
});

export const BatchPostsRequestSchema = z.object({
  userId: z.string().uuid(),
  targetId: z.string().uuid(),
  remainingReplies: z.number().min(0).max(50)
});
```

**Error Handling:**
```typescript
interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export function createErrorResponse(error: Error, status: number = 500): Response {
  const apiError: ApiError = {
    code: error.name || 'INTERNAL_ERROR',
    message: error.message,
    timestamp: new Date().toISOString()
  };
  
  return Response.json({ success: false, error: apiError }, { status });
}
```

**Logging & Monitoring:**
```typescript
interface ApiLog {
  requestId: string;
  method: string;
  url: string;
  userId?: string;
  duration: number;
  status: number;
  error?: string;
}

export function logApiRequest(log: ApiLog) {
  console.log(JSON.stringify(log));
  // Send to monitoring service (DataDog, LogRocket, etc.)
}
```

### Post Curation Algorithm
```typescript
interface MonitoringTarget {
  id: string;
  name: string;
  type: 'topic' | 'twitter_list';
  status: 'active' | 'paused' | 'archived';
}

interface TopicTarget {
  keywords: string[];
  hashtags: string[];
  excludeKeywords: string[];
  minEngagement: number;
  languages: string[];
}

interface TwitterListTarget {
  listId: string;
  includeRetweets: boolean;
  maxPostsPerDay: number;
}

// Enhanced scoring weights with time decay
const WEIGHTS = {
  relevance: 0.35,
  engagement: 0.25,
  relationship: 0.25,
  time_decay: 0.15 // Higher weight for urgency
};

// Time decay calculation for reply urgency
function calculateTimeDecay(postCreatedAt: Date): { score: number; urgency: string } {
  const hoursOld = (Date.now() - postCreatedAt.getTime()) / (1000 * 60 * 60);
  
  // Reply effectiveness drops significantly after certain time periods
  if (hoursOld <= 2) {
    return { score: 1.0, urgency: 'high' }; // Fresh posts, maximum engagement potential
  } else if (hoursOld <= 8) {
    return { score: 0.8, urgency: 'high' }; // Still very relevant
  } else if (hoursOld <= 24) {
    return { score: 0.6, urgency: 'medium' }; // Good engagement window
  } else if (hoursOld <= 72) {
    return { score: 0.3, urgency: 'medium' }; // Declining but still valuable
  } else {
    return { score: 0.1, urgency: 'low' }; // Old posts, limited value
  }
}

// Relationship tracking to prevent over-replying
async function checkReplyFrequency(userId: string, postAuthorId: string): Promise<boolean> {
  const relationship = await supabase
    .from('user_relationships')
    .select('replies_this_week, last_reply_date')
    .eq('user_id', userId)
    .eq('twitter_user_id', postAuthorId)
    .single();
    
  if (!relationship.data) return true; // No previous interaction, safe to reply
  
  // Anti-spam rules
  const daysSinceLastReply = relationship.data.last_reply_date 
    ? (Date.now() - new Date(relationship.data.last_reply_date).getTime()) / (1000 * 60 * 60 * 24)
    : 7;
    
  // Don't reply if:
  // - Replied to this person more than 2 times this week
  // - Replied to them within the last 2 days
  if (relationship.data.replies_this_week >= 2 || daysSinceLastReply < 2) {
    return false;
  }
  
  return true;
}

// Enhanced post context for rich previews
function generatePostContextPreview(post: Tweet): string {
  const engagement = post.public_metrics.like_count + post.public_metrics.retweet_count;
  const timeAgo = formatTimeAgo(post.created_at);
  
  return `@${post.author.username} • ${timeAgo} • ${engagement} interactions\n${post.text.substring(0, 200)}${post.text.length > 200 ? '...' : ''}`;
}

// Post filtering by monitoring target type
function filterPostsByTarget(posts: Tweet[], target: MonitoringTarget): Tweet[] {
  if (target.type === 'topic') {
    return filterByTopicCriteria(posts, target.topicConfig);
  } else if (target.type === 'twitter_list') {
    return filterByListCriteria(posts, target.listConfig);
  }
  return [];
}
```

### Voice Training System & AI Reply Generation

**Voice Training Process:**
```typescript
interface VoiceTrainingProcess {
  // Step 1: Voice Sample Collection
  async collectVoiceSamples(userId: string): Promise<VoiceSample[]> {
    // Collect user's recent tweets (5-10 samples)
    const recentTweets = await getUserRecentTweets(userId, 10);
    
    // Analyze each tweet for voice characteristics
    const samples = await Promise.all(recentTweets.map(async (tweet) => {
      return {
        content: tweet.text,
        tone: await analyzeTone(tweet.text), // formal, casual, humorous, professional
        length: tweet.text.length,
        style_markers: extractStyleMarkers(tweet.text),
        vocabulary_level: assessVocabularyLevel(tweet.text)
      };
    }));
    
    return samples;
  }
  
  // Step 2: Voice Profile Creation
  async createVoiceProfile(samples: VoiceSample[]): Promise<VoiceProfile> {
    return {
      preferred_tone: getMostCommonTone(samples),
      avg_response_length: calculateAverageLength(samples),
      common_phrases: extractCommonPhrases(samples),
      vocabulary_level: assessOverallVocabulary(samples),
      personality_traits: ['professional', 'thoughtful', 'engaging'], // AI-detected
      writing_style: {
        uses_emojis: checkEmojiUsage(samples),
        uses_hashtags: checkHashtagUsage(samples),
        formality_level: 'semi-formal', // formal, semi-formal, casual
        sentence_complexity: 'medium' // simple, medium, complex
      }
    };
  }
}

// AI Reply Generation with Voice Training
async function generateReply(post: Tweet, userId: string): Promise<ReplyGeneration> {
  const voiceProfile = await getUserVoiceProfile(userId);
  const relationship = await getUserRelationship(userId, post.author_id);
  
  // Context-aware prompt engineering
  const prompt = `
You are helping ${voiceProfile.user_handle} reply to this tweet in their authentic voice.

VOICE PROFILE:
- Tone: ${voiceProfile.preferred_tone}
- Style: ${voiceProfile.writing_style.formality_level}
- Length: Usually ${voiceProfile.avg_response_length} characters
- Personality: ${voiceProfile.personality_traits.join(', ')}
- Common phrases: ${voiceProfile.common_phrases.join(', ')}

RELATIONSHIP CONTEXT:
- Previous interactions: ${relationship.total_replies_sent}
- Connection strength: ${relationship.connection_strength}
- Last interaction: ${relationship.last_reply_date || 'None'}

ORIGINAL POST:
Author: @${post.author.username}
Content: ${post.text}
Engagement: ${post.public_metrics.like_count} likes, ${post.public_metrics.retweet_count} retweets

REPLY GUIDELINES:
1. Build authentic professional relationships
2. Add genuine value or insight
3. Match the user's established voice and tone
4. Keep response to ${voiceProfile.avg_response_length}±20 characters
5. ${relationship.total_replies_sent > 0 ? 'Reference previous conversation if relevant' : 'Introduce yourself professionally'}

Generate a thoughtful reply that feels natural and builds connection:
`;

  const aiResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 100,
    temperature: 0.7
  });
  
  const suggestedReply = aiResponse.choices[0].message.content;
  
  // Quality validation
  const qualityCheck = await validateReplyQuality(suggestedReply, post, voiceProfile);
  
  return {
    suggested_reply: suggestedReply,
    quality_score: qualityCheck.score,
    quality_issues: qualityCheck.issues,
    tokens_used: aiResponse.usage.total_tokens,
    generation_time: Date.now()
  };
}

// Reply Quality Validation
async function validateReplyQuality(reply: string, originalPost: Tweet, voiceProfile: VoiceProfile): Promise<QualityCheck> {
  const issues = [];
  let score = 1.0;
  
  // Length validation
  if (reply.length > 280) {
    issues.push('Reply too long for Twitter');
    score -= 0.3;
  }
  
  // Voice consistency check
  const replyTone = await analyzeTone(reply);
  if (replyTone !== voiceProfile.preferred_tone) {
    issues.push(`Tone mismatch: expected ${voiceProfile.preferred_tone}, got ${replyTone}`);
    score -= 0.2;
  }
  
  // Spam/generic content detection
  const genericPhrases = ['great post', 'thanks for sharing', 'totally agree'];
  if (genericPhrases.some(phrase => reply.toLowerCase().includes(phrase))) {
    issues.push('Reply appears generic or spammy');
    score -= 0.4;
  }
  
  // Value-add check
  if (reply.length < 20 || !containsInsightfulContent(reply)) {
    issues.push('Reply lacks substantial value or insight');
    score -= 0.3;
  }
  
  // Professional appropriateness
  if (containsInappropriateContent(reply)) {
    issues.push('Reply contains inappropriate content');
    score = 0; // Auto-reject
  }
  
  return { score: Math.max(0, score), issues };
}

// Continuous Learning from User Edits
async function learnFromUserEdit(originalReply: string, userEdit: string, userId: string) {
  const editAnalysis = {
    length_change: userEdit.length - originalReply.length,
    tone_change: await compareTones(originalReply, userEdit),
    added_phrases: extractNewPhrases(originalReply, userEdit),
    removed_phrases: extractRemovedPhrases(originalReply, userEdit)
  };
  
  // Update user's voice profile based on edits
  await updateVoiceProfile(userId, editAnalysis);
}
```

**Quality Filters:**
1. **Length Validation**: Must fit Twitter's 280 character limit
2. **Voice Consistency**: Matches user's established tone and style
3. **Anti-Spam Detection**: Rejects generic or low-value responses
4. **Professional Appropriateness**: Filters inappropriate content
5. **Value-Add Requirement**: Must provide insight or meaningful engagement
6. **Relationship Awareness**: Considers previous interactions and connection strength

### Error Recovery & User Communication Systems

**Error Recovery Mechanisms:**
```typescript
interface ErrorRecovery {
  // Twitter API failure handling
  async handleTwitterApiFailure(userId: string, error: TwitterApiError): Promise<void> {
    const fallbackActions = {
      'rate_limit_exceeded': async () => {
        // Wait for rate limit reset and retry
        await scheduleRetry(userId, error.reset_time);
        await notifyUser(userId, 'processing_delayed', { reason: 'Twitter API rate limit' });
      },
      'service_unavailable': async () => {
        // Use cached data if available, otherwise skip this cycle
        const cachedPosts = await getCachedPosts(userId);
        if (cachedPosts.length > 0) {
          await processCachedPosts(userId, cachedPosts);
        } else {
          await notifyUser(userId, 'digest_skipped', { reason: 'Twitter API unavailable' });
        }
      },
      'authentication_failed': async () => {
        // Twitter token expired, notify user to re-authenticate
        await notifyUser(userId, 'auth_required', { action: 'reauth_twitter' });
        await pauseProcessing(userId);
      }
    };

    const handler = fallbackActions[error.type];
    if (handler) {
      await handler();
    } else {
      // Generic error handling
      await notifyUser(userId, 'processing_error', { error: error.message });
    }
  }

  // AI generation failure handling
  async handleAiFailure(userId: string, postId: string, error: AiError): Promise<void> {
    const retryStrategies = {
      'content_policy_violation': async () => {
        // Skip this post, it violates content policy
        await logSkippedPost(userId, postId, 'content_policy');
      },
      'token_limit_exceeded': async () => {
        // Retry with shorter prompt
        const shortenedReply = await generateReplyWithShorterPrompt(userId, postId);
        return shortenedReply;
      },
      'model_unavailable': async () => {
        // Use fallback model (GPT-3.5 instead of GPT-4)
        const fallbackReply = await generateReplyWithFallbackModel(userId, postId);
        return fallbackReply;
      }
    };

    const handler = retryStrategies[error.type];
    if (handler) {
      await handler();
    } else {
      await logFailedReply(userId, postId, error.message);
    }
  }
}

// User notification system
interface UserNotification {
  async notifyUser(userId: string, type: NotificationType, data: any): Promise<void> {
    const user = await getUserProfile(userId);
    const notification = buildNotification(type, data, user);
    
    // Send via multiple channels
    await Promise.all([
      sendEmailNotification(user.email, notification),
      saveInAppNotification(userId, notification),
      // Optional: SMS for critical issues (auth failures, etc.)
      ...(notification.priority === 'high' ? [sendSmsNotification(user.phone, notification)] : [])
    ]);
  }

  buildNotification(type: NotificationType, data: any, user: UserProfile): Notification {
    const templates = {
      'processing_delayed': {
        subject: 'Your daily digest is running late',
        message: `Hi ${user.name}, your daily digest is delayed due to ${data.reason}. We'll deliver it as soon as possible.`,
        priority: 'medium'
      },
      'digest_skipped': {
        subject: 'Daily digest skipped',
        message: `Hi ${user.name}, we couldn't generate your digest today due to ${data.reason}. We'll resume tomorrow.`,
        priority: 'medium'
      },
      'auth_required': {
        subject: 'Action required: Re-authenticate your Twitter account',
        message: `Hi ${user.name}, your Twitter connection expired. Please re-authenticate to continue receiving digests.`,
        action_url: `/auth/twitter/reconnect`,
        priority: 'high'
      },
      'processing_error': {
        subject: 'Issue with your daily digest',
        message: `Hi ${user.name}, we encountered an issue generating your digest. Our team has been notified.`,
        priority: 'low'
      },
      'digest_success': {
        subject: `Your daily digest is ready (${data.reply_count} replies)`,
        message: `Hi ${user.name}, your digest with ${data.reply_count} curated replies is ready for review.`,
        action_url: `/digest/${data.digest_id}`,
        priority: 'normal'
      }
    };

    return templates[type];
  }
}

// Graceful degradation strategies
interface GracefulDegradation {
  async handlePartialFailure(userId: string, results: ProcessingResults): Promise<void> {
    if (results.successful_targets > 0 && results.failed_targets > 0) {
      // Some targets succeeded, some failed - send partial digest
      await sendPartialDigest(userId, results);
      await notifyUser(userId, 'partial_digest', {
        successful: results.successful_targets,
        failed: results.failed_targets
      });
    } else if (results.successful_targets === 0) {
      // Complete failure - send empty digest explanation
      await notifyUser(userId, 'digest_failed', {
        reason: 'All monitoring targets failed to process'
      });
    }
  }

  async implementCircuitBreaker(service: string, userId: string): Promise<boolean> {
    const failures = await getRecentFailures(service, userId);
    
    if (failures.count >= 3 && failures.timespan < '1 hour') {
      // Circuit breaker triggered - pause processing for this service
      await pauseServiceForUser(service, userId, '1 hour');
      await notifyUser(userId, 'service_paused', {
        service,
        resume_time: '1 hour'
      });
      return false; // Processing blocked
    }
    
    return true; // Processing allowed
  }
}
```

**User Communication Features:**
1. **Real-time Status Updates**: In-app notifications and email alerts
2. **Failure Notifications**: Clear explanations when things go wrong
3. **Recovery Instructions**: Step-by-step guidance for user actions needed
4. **Graceful Degradation**: Partial results when some services fail
5. **Circuit Breakers**: Automatic pausing to prevent cascading failures
6. **Retry Logic**: Intelligent retry with exponential backoff

### User Onboarding Flow & Topic Discovery

**Smart Onboarding Process:**
```typescript
interface OnboardingFlow {
  // Step 1: Twitter Analysis for Topic Discovery
  async analyzeUserTwitterProfile(userId: string): Promise<TopicSuggestions> {
    const user = await getUserProfile(userId);
    const recentTweets = await getUserRecentTweets(userId, 50);
    const following = await getUserFollowing(userId, 100);
    
    // AI-powered analysis of user's Twitter activity
    const topicAnalysis = await analyzeContent({
      tweets: recentTweets.map(t => t.text),
      bio: user.bio,
      following_accounts: following.map(f => ({ username: f.username, bio: f.bio }))
    });
    
    return {
      suggested_topics: topicAnalysis.top_interests, // ["AI", "Startups", "SaaS"]
      confidence_scores: topicAnalysis.confidence,
      suggested_keywords: topicAnalysis.keywords,
      suggested_hashtags: topicAnalysis.hashtags,
      industry_category: topicAnalysis.industry // "Tech", "Marketing", etc.
    };
  }

  // Step 2: Monitoring Target Setup with Guidance
  async setupMonitoringTargets(userId: string, suggestions: TopicSuggestions): Promise<void> {
    const onboardingTargets = [];
    
    // Create suggested monitoring targets
    for (let i = 0; i < Math.min(3, suggestions.suggested_topics.length); i++) {
      const topic = suggestions.suggested_topics[i];
      const target = await createMonitoringTarget(userId, {
        name: `${topic} Industry Updates`,
        type: 'topic',
        suggested: true, // Mark as system-suggested
        topic_config: {
          keywords: suggestions.suggested_keywords[topic],
          hashtags: suggestions.suggested_hashtags[topic],
          min_engagement: 10, // Start conservative
          languages: ['en']
        }
      });
      onboardingTargets.push(target);
    }
    
    // Suggest relevant Twitter lists
    const listSuggestions = await findRelevantTwitterLists(suggestions.industry_category);
    
    return {
      created_targets: onboardingTargets,
      suggested_lists: listSuggestions,
      next_steps: [
        'Review and customize your monitoring targets',
        'Add or remove keywords based on your interests',
        'Set your preferred daily digest time'
      ]
    };
  }

  // Step 3: Voice Training with Immediate Value Demo
  async initiateVoiceTraining(userId: string): Promise<VoiceTrainingResult> {
    const recentTweets = await getUserRecentTweets(userId, 10);
    
    if (recentTweets.length < 5) {
      // Not enough tweets for training, use guided input
      return {
        training_method: 'guided_input',
        message: 'We need to learn your writing style. Please provide 3-5 example responses you might give to professional tweets.',
        next_step: 'collect_sample_responses'
      };
    }
    
    // Sufficient tweets for automatic training
    const voiceProfile = await createVoiceProfile(recentTweets);
    
    // Generate a demo reply to show immediate value
    const demoPost = await getPopularRecentPost(suggestions.suggested_topics[0]);
    const demoReply = await generateReply(demoPost, userId);
    
    return {
      training_method: 'automatic',
      voice_profile: voiceProfile,
      demo_reply: {
        original_post: demoPost,
        suggested_reply: demoReply.suggested_reply,
        explanation: 'Here\'s how we\'d help you reply to this post in your voice'
      },
      next_step: 'review_and_approve_profile'
    };
  }

  // Step 4: First Digest Preview
  async generateOnboardingDigest(userId: string): Promise<OnboardingDigest> {
    // Generate a small sample digest (3-5 posts) to show value
    const targets = await getUserMonitoringTargets(userId);
    const samplePosts = [];
    
    for (const target of targets.slice(0, 2)) { // Limit to 2 targets for demo
      const posts = await fetchSamplePosts(target, 3);
      samplePosts.push(...posts);
    }
    
    // Generate replies for each post
    const digestPosts = await Promise.all(
      samplePosts.slice(0, 5).map(async (post) => {
        const reply = await generateReply(post, userId);
        const timeDecay = calculateTimeDecay(post.created_at);
        
        return {
          post,
          suggested_reply: reply.suggested_reply,
          urgency: timeDecay.urgency,
          context_preview: generatePostContextPreview(post),
          selection_reason: `Selected for ${target.name}: High relevance and engagement potential`
        };
      })
    );
    
    return {
      sample_digest: digestPosts,
      estimated_time_saved: digestPosts.length * 3, // 3 minutes per reply
      next_steps: [
        'Review and edit the suggested replies',
        'Schedule your daily digest time',
        'Start receiving daily digests'
      ]
    };
  }
}

// API Route: /api/user/onboard
export async function POST(request: Request) {
  const { userId, step, data } = await request.json();
  
  try {
    switch (step) {
      case 'analyze_profile':
        const suggestions = await analyzeUserTwitterProfile(userId);
        return Response.json({ suggestions });
        
      case 'setup_targets':
        const targets = await setupMonitoringTargets(userId, data.suggestions);
        return Response.json({ targets });
        
      case 'voice_training':
        const voiceResult = await initiateVoiceTraining(userId);
        return Response.json({ voice_training: voiceResult });
        
      case 'preview_digest':
        const preview = await generateOnboardingDigest(userId);
        await updateUserProfile(userId, { onboarding_completed: true });
        return Response.json({ preview });
        
      default:
        return Response.json({ error: 'Invalid onboarding step' }, { status: 400 });
    }
  } catch (error) {
    return createErrorResponse(error);
  }
}
```

**Onboarding UX Flow:**
1. **Welcome & Twitter Analysis** (30 seconds)
   - "Let's analyze your Twitter to suggest relevant topics"
   - Show loading with progress: "Analyzing your recent tweets..."
   - Present suggested topics with confidence scores

2. **Monitoring Target Setup** (2 minutes)
   - "Here are 3 monitoring targets we recommend based on your interests"
   - Allow customization: add/remove keywords, adjust engagement thresholds
   - Suggest relevant Twitter lists: "Follow these industry lists for more content"

3. **Voice Training Demo** (1 minute)
   - "Let's learn your writing style to generate authentic replies"
   - Show voice profile summary: "You tend to be professional yet approachable"
   - Demonstrate with sample reply: "Here's how we'd help you reply to this post"

4. **First Digest Preview** (2 minutes)
   - "Here's a sample of what your daily digest will look like"
   - Show 5 curated posts with suggested replies
   - Highlight time savings: "This would normally take you 15 minutes to find and craft replies"

5. **Schedule & Launch** (30 seconds)
   - "When would you like to receive your daily digest?"
   - Set timezone and preferred time
   - "You're all set! Your first digest will arrive tomorrow at 9 AM"

**Onboarding Success Metrics:**
- **Completion Rate**: Target >80% complete onboarding
- **Time to Value**: User sees first digest within 24 hours
- **Initial Engagement**: >60% of users interact with first digest
- **Topic Accuracy**: >70% of suggested topics approved by users

### Relationship Building Logic & Anti-Spam Measures

**Authentic Relationship Building System:**
```typescript
interface RelationshipBuilder {
  // Relationship strength calculation
  async calculateConnectionStrength(userId: string, targetUserId: string): Promise<number> {
    const relationship = await getUserRelationship(userId, targetUserId);
    const factors = {
      // Positive factors
      replies_received: relationship.replies_received * 0.3, // They responded to us
      mutual_follows: relationship.mutual_follows ? 0.2 : 0,
      consistent_engagement: calculateConsistencyScore(relationship) * 0.2,
      time_since_first_interaction: getTimeDecayBonus(relationship.first_interaction_date) * 0.1,
      
      // Negative factors (spam indicators)
      reply_frequency_penalty: calculateFrequencyPenalty(relationship) * -0.4,
      one_way_conversation: relationship.replies_received === 0 && relationship.total_replies_sent > 2 ? -0.3 : 0
    };
    
    const strength = Math.max(0, Math.min(1, 
      factors.replies_received + 
      factors.mutual_follows + 
      factors.consistent_engagement + 
      factors.time_since_first_interaction + 
      factors.reply_frequency_penalty + 
      factors.one_way_conversation
    ));
    
    return strength;
  }

  // Anti-spam reply frequency rules
  async checkReplyPermission(userId: string, targetUserId: string): Promise<ReplyPermission> {
    const relationship = await getUserRelationship(userId, targetUserId);
    const now = new Date();
    
    // Rule 1: Maximum 2 replies per person per week
    if (relationship.replies_this_week >= 2) {
      return {
        allowed: false,
        reason: 'weekly_limit_exceeded',
        message: 'You\'ve already replied to this person twice this week',
        next_allowed: getNextWeekReset()
      };
    }
    
    // Rule 2: Minimum 48 hours between replies to same person
    if (relationship.last_reply_date) {
      const hoursSinceLastReply = (now.getTime() - new Date(relationship.last_reply_date).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastReply < 48) {
        return {
          allowed: false,
          reason: 'too_recent',
          message: 'Wait at least 48 hours between replies to the same person',
          next_allowed: new Date(new Date(relationship.last_reply_date).getTime() + (48 * 60 * 60 * 1000))
        };
      }
    }
    
    // Rule 3: If no response after 3 replies, pause for 10 days
    if (relationship.total_replies_sent >= 3 && relationship.replies_received === 0) {
      const daysSinceFirst = (now.getTime() - new Date(relationship.first_interaction_date).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceFirst < 30) {
        return {
          allowed: false,
          reason: 'no_engagement',
          message: 'This person hasn\'t responded to your previous replies. Let\'s wait 10 days before trying again.',
          next_allowed: new Date(new Date(relationship.first_interaction_date).getTime() + (10 * 24 * 60 * 60 * 1000))
        };
      }
    }
    
    // Rule 4: Check for mutual engagement patterns
    const connectionStrength = await calculateConnectionStrength(userId, targetUserId);
    if (connectionStrength < 0.1 && relationship.total_replies_sent > 1) {
      return {
        allowed: false,
        reason: 'low_connection_strength',
        message: 'Focus on building stronger connections with people who engage back',
        next_allowed: null // Requires manual review
      };
    }
    
    return {
      allowed: true,
      reason: 'approved',
      connection_strength: connectionStrength
    };
  }

  // Smart reply prioritization based on relationship building potential
  async prioritizeRepliesByRelationship(userId: string, candidatePosts: CuratedPost[]): Promise<CuratedPost[]> {
    const prioritizedPosts = await Promise.all(
      candidatePosts.map(async (post) => {
        const permission = await checkReplyPermission(userId, post.post_author_id);
        const relationshipScore = permission.allowed ? (permission.connection_strength || 0.5) : 0;
        
        // Enhanced scoring with relationship factors
        const enhancedScore = {
          ...post,
          relationship_score: relationshipScore,
          reply_permission: permission,
          total_score: post.total_score * (permission.allowed ? 1 : 0) * (1 + relationshipScore)
        };
        
        return enhancedScore;
      })
    );
    
    // Sort by enhanced score and filter out non-allowed replies
    return prioritizedPosts
      .filter(post => post.reply_permission.allowed)
      .sort((a, b) => b.total_score - a.total_score);
  }

  // Relationship insights for user dashboard
  async generateRelationshipInsights(userId: string): Promise<RelationshipInsights> {
    const relationships = await getUserRelationships(userId);
    const insights = {
      total_connections: relationships.length,
      strong_connections: relationships.filter(r => r.connection_strength > 0.7).length,
      mutual_connections: relationships.filter(r => r.mutual_follows).length,
      one_way_conversations: relationships.filter(r => r.total_replies_sent > 0 && r.replies_received === 0).length,
      
      top_connections: relationships
        .sort((a, b) => b.connection_strength - a.connection_strength)
        .slice(0, 10)
        .map(r => ({
          handle: r.twitter_handle,
          strength: r.connection_strength,
          interactions: r.total_replies_sent,
          mutual: r.mutual_follows
        })),
        
      recommendations: generateRelationshipRecommendations(relationships)
    };
    
    return insights;
  }

  // Weekly relationship maintenance
  async performWeeklyRelationshipMaintenance(userId: string): Promise<void> {
    // Reset weekly counters
    await supabase
      .from('user_relationships')
      .update({ replies_this_week: 0 })
      .eq('user_id', userId);
    
    // Archive stale relationships (no interaction in 90 days)
    const staleDate = new Date(Date.now() - (90 * 24 * 60 * 60 * 1000));
    await supabase
      .from('user_relationships')
      .delete()
      .eq('user_id', userId)
      .lt('last_reply_date', staleDate.toISOString())
      .eq('replies_received', 0);
    
    // Update connection strengths
    const relationships = await getUserRelationships(userId);
    for (const relationship of relationships) {
      const newStrength = await calculateConnectionStrength(userId, relationship.twitter_user_id);
      await supabase
        .from('user_relationships')
        .update({ connection_strength: newStrength })
        .eq('id', relationship.id);
    }
  }
}

// Spam detection algorithms
interface SpamDetection {
  async detectSpammyReply(reply: string, originalPost: Tweet): Promise<SpamScore> {
    const spamIndicators = {
      // Generic responses
      generic_phrases: ['great post', 'thanks for sharing', 'totally agree', 'this!', '+1'].filter(phrase => 
        reply.toLowerCase().includes(phrase)
      ).length * 0.3,
      
      // Too short or too long
      length_issues: (reply.length < 10 || reply.length > 250) ? 0.2 : 0,
      
      // No specific reference to original content
      lacks_specificity: !hasSpecificReference(reply, originalPost) ? 0.4 : 0,
      
      // Promotional content
      promotional_content: detectPromotionalContent(reply) * 0.5,
      
      // Excessive emoji or special characters
      excessive_formatting: calculateFormattingExcess(reply) * 0.2
    };
    
    const totalSpamScore = Object.values(spamIndicators).reduce((sum, score) => sum + score, 0);
    
    return {
      score: Math.min(1, totalSpamScore),
      is_spam: totalSpamScore > 0.5,
      indicators: spamIndicators,
      recommendation: totalSpamScore > 0.5 ? 'reject' : totalSpamScore > 0.3 ? 'review' : 'approve'
    };
  }
}
```

**Anti-Spam Rules Summary:**
1. **Weekly Limits**: Maximum 2 replies per person per week
2. **Cooldown Periods**: 48-hour minimum between replies to same person
3. **Engagement Tracking**: Pause outreach if no responses after 3 attempts
4. **Connection Strength**: Prioritize replies to people likely to engage back
5. **Content Quality**: Filter out generic, promotional, or low-value replies
6. **Relationship Maintenance**: Automatically clean up stale connections

**Relationship Building Features:**
1. **Connection Strength Scoring**: 0-1 scale based on mutual engagement
2. **Relationship Insights**: Dashboard showing connection quality and growth
3. **Smart Prioritization**: Favor replies that build stronger relationships
4. **Engagement Tracking**: Monitor who responds to build authentic connections
5. **Relationship CRM**: Notes and history for each connection

### Smart Batching & Cost-Optimized Processing
**API Route: `POST /api/process/user-targets`** - Called by external triggers

**Request Schema:**
```typescript
interface ProcessRequest {
  trigger: 'scheduled' | 'manual' | 'test';
  batch_id: string;
  users?: string[]; // optional, processes all active users if empty
  priority?: 'high' | 'normal' | 'low';
}
```

**Processing Strategy:**
```typescript
// POST /api/process/user-targets
export async function POST(request: Request) {
  try {
    // Authentication check
    const apiKey = request.headers.get('x-api-key');
    if (!validateApiKey(apiKey)) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { trigger, batch_id, users } = ProcessRequestSchema.parse(body);

    // Get users to process
    const targetUsers = users || await getActiveUsers();
    const results = [];

    for (const userId of targetUsers) {
      const result = await processUserTargets(userId);
      results.push({ userId, ...result });
    }

    return Response.json({ 
      success: true, 
      batch_id,
      processed: results.length,
      results 
    });
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

async function processUserTargets(userId: string) {
  // Pre-flight checks
  const userState = await getUserProcessingState(userId);
  const userLimits = await getUserDailyLimits(userId);
  
  if (userState.daily_replies_generated >= userLimits.replies) {
    return { status: 'limit_reached', replies_generated: 0 };
  }
  
  // Check daily cost limit based on posts fetched
  const dailyCost = userState.daily_posts_fetched * 0.0133;
  if (dailyCost >= userLimits.daily_cost_limit) {
    return { status: 'cost_limit_reached', replies_generated: 0 };
  }
  
  const activeTargets = await getActiveTargets(userId);
  let repliesGenerated = userState.daily_replies_generated;
  
  // Process targets in priority order
  for (const target of activeTargets) {
    if (repliesGenerated >= userLimits.replies) break;
    
    // Call internal API for batch processing
    const batchResult = await fetch('/api/process/batch-posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId,
        targetId: target.id,
        remainingReplies: userLimits.replies - repliesGenerated
      })
    });
    
    const { posts_fetched, replies } = await batchResult.json();
    repliesGenerated += replies.length;
    
    // Update processing state after each target
    await updateProcessingState(userId, { 
      daily_replies_generated: repliesGenerated,
      daily_posts_fetched: userState.daily_posts_fetched + posts_fetched,
      last_processing_run: new Date(),
      current_target_index: target.index 
    });
  }
  
  // Send digest if new replies were generated
  if (repliesGenerated > userState.daily_replies_generated) {
    await fetch('/api/digest/send', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  return { 
    status: 'completed', 
    replies_generated: repliesGenerated - userState.daily_replies_generated 
  };
}
```

**External Trigger Integration:**
- **GitHub Actions**: Scheduled workflows calling the API
- **Cron Services**: EasyCron, cron-job.org, etc.
- **Cloud Schedulers**: Vercel Cron, AWS EventBridge, etc.
- **Manual Triggers**: Admin interface for testing

**Benefits:**
- RESTful API design with proper HTTP semantics
- External scheduling flexibility (not tied to specific platform)
- Comprehensive error handling and logging
- Idempotent operations for safe retries
- Real-time cost tracking and circuit breakers

**Monitoring Target Processing:**
- Each post is linked to its source monitoring target for analytics
- Users can see which target generated each post suggestion
- Performance metrics tracked per monitoring target

### Monitoring Targets Implementation Details

#### Topic Target Processing
```typescript
interface TopicProcessing {
  // Twitter API v2 search query construction
  buildSearchQuery(target: TopicTarget): string {
    const keywords = target.keywords.map(k => `"${k}"`).join(' OR ');
    const hashtags = target.hashtags.join(' OR ');
    const exclude = target.excludeKeywords.map(k => `-${k}`).join(' ');
    
    return `(${keywords} OR ${hashtags}) ${exclude} lang:${target.languages.join(' OR lang:')}`;
  }
  
  // Filter by engagement threshold
  filterByEngagement(posts: Tweet[], minEngagement: number): Tweet[] {
    return posts.filter(post => 
      (post.public_metrics.like_count + 
       post.public_metrics.retweet_count + 
       post.public_metrics.reply_count) >= minEngagement
    );
  }
}
```

#### Twitter List Target Processing
```typescript
interface ListProcessing {
  // Fetch list timeline using Twitter API v2
  async fetchListTimeline(listId: string, includeRetweets: boolean): Promise<Tweet[]> {
    const params = {
      'list.fields': 'name,owner_username',
      'tweet.fields': 'public_metrics,created_at,author_id',
      'user.fields': 'username,name',
      'exclude': includeRetweets ? undefined : 'retweets'
    };
    
    return await twitterClient.lists.listTweets(listId, params);
  }
  
  // Apply daily post limit per list
  limitPostsPerDay(posts: Tweet[], maxPosts: number): Tweet[] {
    return posts
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, maxPosts);
  }
}
```

#### Unified Curation Pipeline
```typescript
interface CurationPipeline {
  async generateDailyDigest(userId: string): Promise<CuratedPost[]> {
    const user = await getUser(userId);
    const activeTargets = await getActiveMonitoringTargets(userId);
    const allPosts: Tweet[] = [];
    
    // Process each monitoring target
    for (const target of activeTargets) {
      let posts: Tweet[] = [];
      
      if (target.type === 'topic') {
        const query = buildSearchQuery(target.topicConfig);
        posts = await searchTweets(query, { since: '24h' });
        posts = filterByEngagement(posts, target.topicConfig.minEngagement);
      } else if (target.type === 'twitter_list') {
        posts = await fetchListTimeline(
          target.listConfig.listId,
          target.listConfig.includeRetweets
        );
        posts = limitPostsPerDay(posts, target.listConfig.maxPostsPerDay);
      }
      
      // Tag posts with their source target
      const taggedPosts = posts.map(post => ({
        ...post,
        sourceTargetId: target.id,
        sourceTargetName: target.name
      }));
      
      allPosts.push(...taggedPosts);
    }
    
    // Deduplicate and score
    const uniquePosts = deduplicatePosts(allPosts);
    const scoredPosts = await scorePosts(uniquePosts, user);
    
    // Select top posts for digest
    return selectTopPosts(scoredPosts, user.subscriptionTier);
  }
}
```

### Cost-Optimized API Strategy for Next.js Routes
**Primary Goal:** Minimize Twitter API costs while guaranteeing user reply quotas

**API Route: `/api/process/batch-posts`**
```typescript
export async function POST(request: Request) {
  const { userId, targetId, remainingReplies } = await request.json();
  
  try {
    // Cost optimization with historical data
    const target = await getMonitoringTarget(targetId);
    const hitRate = await getHistoricalHitRate(targetId);
    const optimalBatchSize = Math.max(10, Math.ceil(remainingReplies / hitRate));
    
    const result = await fetchAndProcessBatch({
      target,
      userId,
      batchSize: optimalBatchSize,
      maxReplies: remainingReplies
    });
    
    return Response.json(result);
  } catch (error) {
    return createErrorResponse(error);
  }
}

async function fetchAndProcessBatch(params: BatchParams) {
  const { target, userId, batchSize, maxReplies } = params;
  let repliesGenerated = 0;
  let totalPostsFetched = 0;
  const generatedReplies = [];
  
  // Progressive fetching with immediate processing
  while (repliesGenerated < maxReplies) {
    // Fetch small batch
    const posts = await fetchPostsFromTwitter(target, batchSize);
    totalPostsFetched += posts.length;
    
    // Log posts fetched (actual cost driver)
    await logApiUsage(userId, 'twitter_posts_read', posts.length);
    
    // Process posts immediately
    for (const post of posts) {
      if (repliesGenerated >= maxReplies) break;
      
      // Check reply criteria before generating
      const matchesResult = await fetch('/api/process/match-criteria', {
        method: 'POST',
        body: JSON.stringify({ post, target, userId })
      });
      
      if (matchesResult.ok) {
        const { matches } = await matchesResult.json();
        if (matches) {
          const reply = await generateReply(post, userId);
          await storePostAndReply(post, reply, userId, target.id);
          generatedReplies.push(reply);
          repliesGenerated++;
          
          // Log AI tokens used separately
          await logApiUsage(userId, 'ai_generation', 0, reply.tokens_used);
        }
      }
    }
    
    // Break if no more posts available
    if (posts.length < batchSize) break;
  }
  
  return { 
    posts_fetched: totalPostsFetched,
    replies_generated: repliesGenerated,
    replies: generatedReplies 
  };
}
```

**Cost Control Mechanisms:**
1. **Pre-flight Checks**: API routes verify user limits before processing
2. **Smart Batching**: Historical hit rate optimization per target
3. **Circuit Breakers**: Stop processing when user quota reached
4. **Progressive Processing**: Fetch small batches, process immediately
5. **Real-time Tracking**: Log posts fetched (actual cost) and AI tokens separately
6. **Timeout Handling**: Request timeouts prevent hanging processes
7. **Cost-based Limits**: Track posts fetched at $0.0133 per post for accurate budgeting

**API Route: `/api/admin/cost-monitoring`**
```typescript
export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const timeframe = url.searchParams.get('timeframe') || '24h';
  
  const costData = await getCostAnalytics(userId, timeframe);
  
  return Response.json({
    daily_spend: costData.total_cost_usd,
    posts_fetched: costData.total_posts_fetched, // Changed from api_calls
    replies_generated: costData.total_replies,
    cost_per_reply: costData.cost_per_reply,
    cost_per_post: costData.total_cost_usd / costData.total_posts_fetched, // $0.0133 expected
    remaining_budget: costData.remaining_budget,
    projected_monthly_cost: costData.projected_monthly
  });
}
```

**Emergency Cost Protection:**
```typescript
// Middleware for cost protection based on posts fetched
export async function costProtectionMiddleware(userId: string) {
  const { daily_posts_fetched } = await getUserProcessingState(userId);
  const dailySpend = daily_posts_fetched * 0.0133; // $200 per 15,000 posts
  const userTier = await getUserTier(userId);
  const limit = TIER_LIMITS[userTier].daily_cost_limit;
  
  if (dailySpend >= limit * 0.9) { // 90% warning threshold
    await sendCostAlert(userId, dailySpend, limit);
  }
  
  if (dailySpend >= limit) {
    throw new Error('Daily cost limit exceeded');
  }
}

// SQL query for budget checks
const checkBudgetQuery = `
  SELECT 
    daily_posts_fetched,
    daily_posts_fetched * 0.0133 as estimated_daily_cost,
    CASE 
      WHEN daily_posts_fetched * 0.0133 >= $2 THEN 'BUDGET_EXCEEDED'
      WHEN daily_posts_fetched * 0.0133 >= $2 * 0.9 THEN 'BUDGET_WARNING'
      ELSE 'OK'
    END as budget_status
  FROM user_processing_state 
  WHERE user_id = $1;
`;
```

**Caching Strategy (Next.js specific):**
- Use Next.js unstable_cache for Twitter list metadata (24h TTL)
- Redis caching for user voice training data
- In-memory caching for monitoring target configurations
- No caching of actual posts (real-time data)

## Risk Mitigation

### Technical Risks
1. **Twitter API changes**: Build abstraction layer, monitor API updates
2. **AI token costs**: Implement usage monitoring, optimize prompts
3. **Email deliverability**: Use reputable service, implement authentication
4. **Rate limiting**: Implement queuing system, batch operations

### Business Risks
1. **User adoption**: Focus on onboarding UX, provide immediate value
2. **Content quality**: Implement feedback loops, continuous AI training
3. **Competition**: Focus on unique voice training and relationship building
4. **Scaling costs**: Monitor unit economics, optimize algorithms

## Success Metrics Implementation

### Technical Metrics
- API response times < 200ms
- Email delivery rate > 98%
- System uptime > 99.5%
- AI reply approval rate > 60%

### User Metrics
- Daily digest open rate > 70%
- Time in app < 10 minutes per session
- Reply edit rate < 30% after month 1
- User retention > 80% week 1, > 95% month 1

## Next Steps

1. Review and approve this plan
2. Begin Phase 1 development
3. Set up monitoring and analytics tracking
4. Create development milestones and check points
5. Plan user testing and feedback collection

## Post-MVP Enhancements

### Planned Features
- Advanced AI training with user feedback
- Hybrid monitoring targets (topic + list combinations)
- Team collaboration features with shared monitoring targets
- Advanced analytics per monitoring target
- Mobile app development
- Automated reply posting (with safety checks)
- Integration with other social platforms
- Smart monitoring target suggestions based on user behavior
- Competitor tracking and analysis features

### Optimization Areas
- AI model fine-tuning based on user success
- Advanced post curation using machine learning
- Predictive analytics for optimal posting times
- Enhanced relationship scoring algorithms
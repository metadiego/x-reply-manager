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

**Core API Routes:**
1. **`/api/process/user-targets`** - Main processing endpoint (external trigger)
2. **`/api/process/batch-posts`** - Intelligent post fetching with cost controls
3. **`/api/process/generate-reply`** - AI reply generation with voice training
4. **`/api/process/match-criteria`** - Smart filtering to prevent unnecessary replies
5. **`/api/digest/send`** - Email digest generation
6. **`/api/admin/reset-limits`** - Daily limit reset (admin endpoint)

**API Authentication & Security:**
- **API Key Authentication**: Secure tokens for external triggers
- **Rate Limiting**: Per-endpoint rate limits using Redis/memory cache
- **Request Validation**: Zod schemas for all inputs
- **Error Handling**: Structured error responses with proper HTTP codes
- **Logging**: Comprehensive request/response logging
- **CORS**: Properly configured for external service calls

**Processing Flow:**
```
External Trigger (cron service, GitHub Actions)
↓
POST /api/process/user-targets
{
  "trigger": "scheduled",
  "batch_id": "uuid",
  "users": ["user_id"] // optional, processes all if empty
}
↓
For each user:
  - Check daily limits
  - For each target:
    - Call /api/process/batch-posts (internal)
    - Call /api/process/match-criteria (internal)
    - Call /api/process/generate-reply (internal)
    - Store post + reply
    - Update cost tracking
    - STOP if daily limit reached
↓
Call /api/digest/send (if new replies)
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
  subscription_tier TEXT,
  daily_digest_time TIME,
  timezone TEXT,
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
  total_score FLOAT, -- calculated final score
  selection_reason TEXT,
  digest_date DATE,
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

-- User processing state and cost tracking
user_processing_state (
  user_id UUID PRIMARY KEY REFERENCES users_profiles(id),
  daily_replies_generated INTEGER DEFAULT 0,
  daily_posts_fetched INTEGER DEFAULT 0, -- Tracks actual posts read from Twitter API
  last_processing_run TIMESTAMP,
  processing_status TEXT DEFAULT 'idle', -- 'idle', 'processing', 'completed', 'error'
  current_target_index INTEGER DEFAULT 0,
  daily_reset_at TIMESTAMP DEFAULT (CURRENT_DATE + INTERVAL '1 day'),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- API usage and cost tracking
api_usage_log (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users_profiles(id),
  operation_type TEXT NOT NULL, -- 'twitter_posts_read', 'ai_generation'
  posts_fetched INTEGER NOT NULL DEFAULT 0, -- Primary cost metric: actual posts read from Twitter
  ai_tokens_used INTEGER DEFAULT 0, -- For AI generation operations
  estimated_cost_usd DECIMAL(10,4), -- posts_fetched * $0.0133 + tokens * token_rate
  monitoring_target_id UUID REFERENCES monitoring_targets(id),
  replies_generated INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Processing batches for tracking efficiency
processing_batches (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users_profiles(id),
  batch_type TEXT NOT NULL, -- 'scheduled', 'manual', 'backfill'
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  total_posts_fetched INTEGER DEFAULT 0,
  total_replies_generated INTEGER DEFAULT 0,
  total_cost_usd DECIMAL(10,4),
  status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed', 'stopped'
  error_message TEXT
);

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
3. Design digest email template
4. Implement batch reply approval interface
5. Add "explain selection" feature for each post
6. Create scheduling and posting pipeline

**Deliverables:**
- Users receive daily email digests
- Web interface for reviewing and approving replies
- Automated posting of approved replies

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

// Scoring weights
const WEIGHTS = {
  relevance: 0.4,
  engagement: 0.25,
  relationship: 0.25,
  recency: 0.1
};

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

### Voice Training System
- Collect 5-10 sample tweets/replies from user
- Analyze writing style, tone, vocabulary, sentence structure
- Create style guidelines for AI model
- Continuously improve based on user edits and feedback

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
- Analytics & Dashboard for reply performance
- Advanced AI training with user feedback
- Hybrid monitoring targets (topic + list combinations)
- Team collaboration features with shared monitoring targets
- Advanced analytics per monitoring target
- Automated reply posting (with safety checks)
- Integration with other social platforms
- Smart monitoring target suggestions based on user behavior
- Competitor tracking and analysis features

### Optimization Areas
- Real time replies
- AI model fine-tuning based on user success
- Advanced post curation using machine learning
- Predictive analytics for optimal posting times
- Enhanced relationship scoring algorithms
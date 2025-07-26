# X Reply Manager MVP Development Plan

## Overview
This plan outlines the development of an X (Twitter) Reply Manager MVP based on the requirements document. The application will provide AI-curated daily digests of relevant posts with suggested replies to help professionals maintain consistent engagement on X.

## Technical Architecture

### Tech Stack
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Backend**: Next.js API routes, Server Actions
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Twitter OAuth
- **Styling**: Tailwind CSS + shadcn/ui components
- **AI Integration**: OpenAI API for reply generation
- **Twitter Integration**: Twitter API v2
- **Email**: SendGrid/Mailgun for notifications
- **Analytics**: Mixpanel
- **Payments**: RevenueCat

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

-- Analytics tracking
engagement_metrics (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users_profiles(id),
  reply_suggestion_id UUID REFERENCES reply_suggestions(id),
  likes_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  retweets_count INTEGER DEFAULT 0,
  impressions_count INTEGER DEFAULT 0,
  measured_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Development Phases

### Phase 1: Foundation & Authentication (Week 1)
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

### Phase 2: Twitter Integration & Data Collection (Week 2)
**Tasks:**
1. Implement Twitter API v2 client wrapper
2. Create post curation algorithm for monitoring targets
3. Build topic-based post fetching (keywords/hashtags)
4. Implement Twitter lists timeline fetching
5. Create unified post scoring and filtering system
6. Implement monitoring targets management interface
7. Add post deduplication and caching logic

**Deliverables:**
- System fetches posts from both topic and Twitter list targets
- Unified post scoring algorithm across target types
- Monitoring targets can be created, edited, paused, and archived
- Basic post curation working for all target types

### Phase 3: AI Reply Generation (Week 3)
**Tasks:**
1. Integrate OpenAI API for reply generation
2. Implement voice modeling based on user samples
3. Create reply suggestion generation pipeline
4. Build reply editing interface
5. Add character count validation
6. Implement reply scheduling system

**Deliverables:**
- AI can generate contextual replies in user's voice style
- Users can edit and schedule replies
- Real-time character count validation

### Phase 4: Daily Digest System (Week 4)
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

### Phase 5: Analytics & Dashboard (Week 5)
**Tasks:**
1. Implement engagement metrics tracking
2. Create analytics dashboard UI
3. Build relationship tracking system
4. Add time-saved calculations
5. Integrate Mixpanel for user analytics
6. Create weekly summary reports

**Deliverables:**
- Basic analytics dashboard showing engagement metrics
- Relationship tracking by Twitter account
- Time saved calculations

### Phase 6: Subscription & Payments (Week 6)
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

### Post Curation Algorithm
```typescript
interface PostScore {
  relevance: number; // 0-1, based on monitoring target matching
  engagement: number; // 0-1, based on likes/replies/retweets
  relationship: number; // 0-1, based on author importance/existing relationship
  recency: number; // 0-1, time decay factor
  total: number; // weighted combination
}

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

### Daily Digest Generation
1. Run every morning at user's specified time
2. For each active monitoring target:
   - **Topic targets**: Search Twitter API for keywords/hashtags from last 24 hours
   - **Twitter list targets**: Fetch timeline posts from specified lists
3. Apply target-specific filtering (engagement thresholds, exclude keywords, etc.)
4. Score and rank all posts using unified algorithm
5. Select top 10-20 posts across all monitoring targets
6. Generate AI replies for selected posts
7. Send email digest with web app link
8. Store curated posts and suggestions in database for user review

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

### API Rate Limiting Strategy
- Implement intelligent caching of Twitter data
- Batch API requests efficiently per monitoring target
- Use webhooks where possible to reduce polling
- Implement exponential backoff for rate limits
- Monitor usage per user and per target to stay within budget constraints
- Cache Twitter list metadata to reduce API calls

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
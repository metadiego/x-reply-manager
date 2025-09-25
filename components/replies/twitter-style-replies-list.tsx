'use client';

import { TwitterStyleReplyCard } from './twitter-style-reply-card';
import { Loader2 } from 'lucide-react';

interface Reply {
  id: string;
  suggested_reply: string;
  user_edited_reply?: string;
  status: string;
  created_at: string;
  curated_post: {
    twitter_post_id: string;
    post_content: string;
    post_author_handle: string;
    post_url: string;
    post_created_at?: string;
    engagement_score?: number;
    relevance_score?: number;
    total_score?: number;
  };
}

interface TwitterStyleRepliesListProps {
  replies: Reply[];
  onPost: (id: string, replyText: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onEdit: (id: string, newText: string) => Promise<void>;
  isLoading?: boolean;
}

export function TwitterStyleRepliesList({
  replies,
  onPost,
  onReject,
  onEdit,
  isLoading = false
}: TwitterStyleRepliesListProps) {

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (replies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <p className="text-xl font-bold mb-2">No replies yet</p>
        <p className="text-muted-foreground">
          When tweets matching your monitoring targets are found, they'll appear here.
        </p>
      </div>
    );
  }

  // Filter to show pending replies first, then others
  const pendingReplies = replies.filter(r => r.status === 'pending');
  const otherReplies = replies.filter(r => r.status !== 'pending');
  const sortedReplies = [...pendingReplies, ...otherReplies];

  return (
    <div className="divide-y">
      {sortedReplies.map((reply) => (
        <TwitterStyleReplyCard
          key={reply.id}
          reply={reply}
          onPost={onPost}
          onReject={onReject}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
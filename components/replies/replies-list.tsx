'use client';

import { useState } from 'react';
import { ReplyCard } from './reply-card';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Loader2 } from 'lucide-react';
import { isToday, isYesterday, format } from 'date-fns';

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

interface RepliesListProps {
  replies: Reply[];
  onPost: (id: string, replyText: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onEdit: (id: string, newText: string) => Promise<void>;
  isLoading?: boolean;
}

export function RepliesList({ replies, onPost, onReject, onEdit, isLoading = false }: RepliesListProps) {
  // Group replies by date
  const groupedReplies = replies.reduce((groups, reply) => {
    const date = new Date(reply.created_at);
    let groupKey: string;

    if (isToday(date)) {
      groupKey = 'Today';
    } else if (isYesterday(date)) {
      groupKey = 'Yesterday';
    } else {
      groupKey = format(date, 'MMMM d, yyyy');
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(reply);
    return groups;
  }, {} as Record<string, Reply[]>);

  // Sort group keys to ensure Today comes first, then Yesterday, then dates in reverse chronological order
  const sortedGroupKeys = Object.keys(groupedReplies).sort((a, b) => {
    if (a === 'Today') return -1;
    if (b === 'Today') return 1;
    if (a === 'Yesterday') return -1;
    if (b === 'Yesterday') return 1;

    // For date strings, parse and compare
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateB.getTime() - dateA.getTime();
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading reply suggestions...</p>
        </CardContent>
      </Card>
    );
  }

  if (replies.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Mail className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No reply suggestions yet</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Once your monitoring targets find relevant tweets, AI-generated reply suggestions will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {sortedGroupKeys.map((groupKey) => {
        const groupReplies = groupedReplies[groupKey];
        const pendingCount = groupReplies.filter(r => r.status === 'pending').length;

        return (
          <div key={groupKey} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{groupKey}</h3>
              {pendingCount > 0 && (
                <span className="text-sm text-muted-foreground">
                  {pendingCount} pending {pendingCount === 1 ? 'reply' : 'replies'}
                </span>
              )}
            </div>
            <div className="grid gap-4">
              {groupReplies.map((reply) => (
                <ReplyCard
                  key={reply.id}
                  reply={reply}
                  onPost={onPost}
                  onReject={onReject}
                  onEdit={onEdit}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
'use client';

import { ModernReplyCard } from './modern-reply-card';
import { Loader2 } from 'lucide-react';
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
    post_author_id?: string;
    post_url: string;
    post_created_at?: string;
    engagement_score?: number;
    relevance_score?: number;
  };
}

interface ModernRepliesListProps {
  replies: Reply[];
  onPost: (id: string, replyText: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onEdit: (id: string, newText: string) => Promise<void>;
  isLoading?: boolean;
}

export function ModernRepliesList({
  replies,
  onPost,
  onReject,
  onEdit,
  isLoading = false
}: ModernRepliesListProps) {

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (replies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="h-16 w-16 rounded-full bg-muted mb-4 flex items-center justify-center">
          <svg
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">No reply suggestions yet</h3>
        <p className="text-muted-foreground max-w-md">
          When tweets matching your monitoring targets are found, AI-generated reply suggestions will appear here.
        </p>
      </div>
    );
  }

  // Group replies by date
  const groupedReplies = replies.reduce((groups, reply) => {
    const date = new Date(reply.created_at);
    let groupKey: string;

    if (isToday(date)) {
      groupKey = 'Today';
    } else if (isYesterday(date)) {
      groupKey = 'Yesterday';
    } else {
      groupKey = format(date, 'EEEE, MMMM d');
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(reply);
    return groups;
  }, {} as Record<string, Reply[]>);

  // Sort group keys
  const sortedGroupKeys = Object.keys(groupedReplies).sort((a, b) => {
    if (a === 'Today') return -1;
    if (b === 'Today') return 1;
    if (a === 'Yesterday') return -1;
    if (b === 'Yesterday') return 1;
    return 0;
  });

  return (
    <div className="p-4 space-y-8">
      {sortedGroupKeys.map((groupKey) => {
        const groupReplies = groupedReplies[groupKey];
        const pendingCount = groupReplies.filter(r => r.status === 'pending').length;

        return (
          <div key={groupKey} className="space-y-4">
            {/* Date Header */}
            <div className="flex items-center justify-between px-2">
              <h2 className="text-lg font-semibold">{groupKey}</h2>
              {pendingCount > 0 && (
                <span className="text-sm px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                  {pendingCount} pending
                </span>
              )}
            </div>

            {/* Reply Cards */}
            <div className="grid gap-4">
              {groupReplies.map((reply) => (
                <ModernReplyCard
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
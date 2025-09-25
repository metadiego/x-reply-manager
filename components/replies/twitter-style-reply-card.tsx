'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Heart,
  MessageCircle,
  Repeat2,
  BarChart3,
  Share,
  Bookmark,
  MoreHorizontal,
  X,
  Send
} from 'lucide-react';
import { format } from 'date-fns';

interface TwitterStyleReplyCardProps {
  reply: {
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
  };
  onPost: (id: string, replyText: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onEdit: (id: string, newText: string) => Promise<void>;
}

export function TwitterStyleReplyCard({ reply, onPost, onReject, onEdit }: TwitterStyleReplyCardProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [editedReply, setEditedReply] = useState(reply.user_edited_reply || reply.suggested_reply);
  const [isLoading, setIsLoading] = useState(false);

  const handlePost = async () => {
    setIsLoading(true);
    try {
      await onPost(reply.id, editedReply);
      setIsReplying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      await onReject(reply.id);
      setIsReplying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (editedReply !== (reply.user_edited_reply || reply.suggested_reply)) {
      await onEdit(reply.id, editedReply);
    }
  };

  // Mock engagement metrics
  const mockMetrics = {
    likes: Math.floor(Math.random() * 100),
    retweets: Math.floor(Math.random() * 20),
    replies: Math.floor(Math.random() * 30),
    views: Math.floor(Math.random() * 1000)
  };

  const scorePercentage = (reply.curated_post.total_score || 0) * 100;

  return (
    <article className="border-b hover:bg-muted/30 transition-colors">
      <div className="px-4 py-3">
        {/* Tweet Header */}
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="h-12 w-12 rounded-full bg-muted" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Author info and menu */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1 flex-wrap">
                <a
                  href={reply.curated_post.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold hover:underline"
                >
                  {reply.curated_post.post_author_handle}
                </a>
                <span className="text-muted-foreground">@{reply.curated_post.post_author_handle}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground hover:underline">
                  {reply.curated_post.post_created_at
                    ? format(new Date(reply.curated_post.post_created_at), 'MMM d')
                    : '1h'}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>

            {/* Tweet content */}
            <div className="mt-1">
              <p className="text-[15px] leading-normal whitespace-pre-wrap break-words">
                {reply.curated_post.post_content}
              </p>
            </div>

            {/* Engagement buttons */}
            <div className="flex items-center justify-between mt-3 max-w-md">
              <Button
                variant="ghost"
                size="sm"
                className="group flex items-center gap-1 rounded-full hover:bg-blue-500/10 hover:text-blue-500 px-2"
                onClick={() => setIsReplying(!isReplying)}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">{mockMetrics.replies}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="group flex items-center gap-1 rounded-full hover:bg-green-500/10 hover:text-green-500 px-2"
              >
                <Repeat2 className="h-4 w-4" />
                <span className="text-sm">{mockMetrics.retweets}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="group flex items-center gap-1 rounded-full hover:bg-red-500/10 hover:text-red-500 px-2"
              >
                <Heart className="h-4 w-4" />
                <span className="text-sm">{mockMetrics.likes}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="group flex items-center gap-1 rounded-full hover:bg-blue-500/10 hover:text-blue-500 px-2"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm">{mockMetrics.views}</span>
              </Button>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-blue-500/10 hover:text-blue-500"
                >
                  <Bookmark className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-blue-500/10 hover:text-blue-500"
                >
                  <Share className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* AI Score Badge */}
            {scorePercentage > 0 && (
              <div className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                <BarChart3 className="h-3 w-3" />
                AI Score: {scorePercentage.toFixed(0)}%
              </div>
            )}
          </div>
        </div>

        {/* Reply Section - Only show for pending replies or when replying */}
        {(isReplying || reply.status === 'pending') && (
          <div className="mt-3 ml-[60px] border-l-2 border-muted pl-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-500" />
              </div>
              <div className="flex-1">
                <div className="mb-2">
                  <span className="text-sm text-muted-foreground">
                    Replying to <span className="text-blue-500">@{reply.curated_post.post_author_handle}</span>
                  </span>
                </div>
                <Textarea
                  value={editedReply}
                  onChange={(e) => setEditedReply(e.target.value)}
                  onBlur={handleSaveEdit}
                  placeholder="Post your reply"
                  className="min-h-[80px] resize-none border-0 p-0 focus-visible:ring-0 text-[15px]"
                  maxLength={280}
                  disabled={isLoading}
                />
                <div className="flex items-center justify-between mt-2 border-t pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {editedReply.length}/280
                    </span>
                    {reply.status === 'pending' && (
                      <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                        AI Suggested
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReject}
                      disabled={isLoading}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Skip
                    </Button>
                    <Button
                      size="sm"
                      onClick={handlePost}
                      disabled={isLoading || editedReply.trim() === ''}
                      className="rounded-full px-4"
                    >
                      Reply
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status indicators for non-pending */}
        {reply.status === 'posted' && (
          <div className="mt-2 ml-[60px] text-sm text-green-600">
            ✓ Reply posted
          </div>
        )}
        {reply.status === 'skipped' && (
          <div className="mt-2 ml-[60px] text-sm text-muted-foreground">
            — Reply skipped
          </div>
        )}
      </div>
    </article>
  );
}
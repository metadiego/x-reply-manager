'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Twitter, Heart, MessageCircle, Repeat2, BarChart3, Check, X, Send, Edit2, Save, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface ReplyCardProps {
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

export function ReplyCard({ reply, onPost, onReject, onEdit }: ReplyCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedReply, setEditedReply] = useState(reply.user_edited_reply || reply.suggested_reply);
  const [isLoading, setIsLoading] = useState(false);

  const handlePost = async () => {
    setIsLoading(true);
    try {
      await onPost(reply.id, editedReply);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      await onReject(reply.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    setIsLoading(true);
    try {
      await onEdit(reply.id, editedReply);
      setIsEditing(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedReply(reply.user_edited_reply || reply.suggested_reply);
    setIsEditing(false);
  };

  // Mock engagement metrics - in real app, these would come from the tweet data
  const mockMetrics = {
    likes: Math.floor(Math.random() * 100),
    retweets: Math.floor(Math.random() * 20),
    replies: Math.floor(Math.random() * 30)
  };

  const scorePercentage = (reply.curated_post.total_score || 0) * 100;

  return (
    <div className="relative">
      {/* Status indicator at top right */}
      {reply.status === 'posted' && (
        <div className="absolute -top-2 right-0 z-10">
          <span className="flex items-center gap-1 text-sm text-green-600 bg-green-50 dark:bg-green-950 px-2 py-1 rounded-full border border-green-200 dark:border-green-800">
            <Check className="h-3 w-3" />
            Posted
          </span>
        </div>
      )}
      {reply.status === 'skipped' && (
        <div className="absolute -top-2 right-0 z-10">
          <span className="flex items-center gap-1 text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
            <X className="h-3 w-3" />
            Skipped
          </span>
        </div>
      )}

      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${reply.status === 'posted' ? 'opacity-60' : ''}`}>
        {/* Tweet Card - Left Side */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Twitter className="h-4 w-4 text-blue-500" />
                <a
                  href={reply.curated_post.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold hover:underline text-sm"
                >
                  @{reply.curated_post.post_author_handle}
                </a>
                {reply.curated_post.post_created_at && (
                  <span className="text-xs text-muted-foreground">
                    · {format(new Date(reply.curated_post.post_created_at), 'MMM d')}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <p className="text-sm">{reply.curated_post.post_content}</p>

            {/* Tweet Metrics */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2">
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {mockMetrics.likes}
              </span>
              <span className="flex items-center gap-1">
                <Repeat2 className="h-3 w-3" />
                {mockMetrics.retweets}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {mockMetrics.replies}
              </span>
              {scorePercentage > 0 && (
                <span className="flex items-center gap-1 ml-auto">
                  <BarChart3 className="h-3 w-3" />
                  {scorePercentage.toFixed(0)}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Arrow indicator - only visible on larger screens */}
        <div className="hidden lg:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="bg-background border rounded-full p-2">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Reply Card - Right Side */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Your Reply</span>
              {!isEditing && reply.status === 'pending' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  disabled={isLoading}
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editedReply}
                  onChange={(e) => setEditedReply(e.target.value)}
                  className="min-h-[100px] resize-none text-sm"
                  maxLength={280}
                  disabled={isLoading}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {editedReply.length}/280
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={isLoading || editedReply.trim() === ''}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm bg-muted/50 rounded-lg p-3 min-h-[100px]">
                  {reply.user_edited_reply || reply.suggested_reply}
                </p>
                {reply.status === 'pending' && (
                  <div className="text-xs text-muted-foreground text-right">
                    {(reply.user_edited_reply || reply.suggested_reply).length}/280
                  </div>
                )}
              </div>
            )}
          </CardContent>

          {reply.status === 'pending' && (
            <CardFooter className="flex justify-between pt-0 pb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReject}
                disabled={isLoading || isEditing}
              >
                <X className="h-3 w-3 mr-1" />
                Reject
              </Button>
              <Button
                size="sm"
                onClick={handlePost}
                disabled={isLoading || isEditing || editedReply.trim() === ''}
              >
                <Send className="h-3 w-3 mr-1" />
                Post Reply
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
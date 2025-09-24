'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Twitter, Heart, MessageCircle, Repeat2, BarChart3, Check, X, Send, Edit2, Save } from 'lucide-react';
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
    <Card className={reply.status === 'posted' ? 'opacity-60' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Twitter className="h-4 w-4 text-blue-500" />
            <a
              href={reply.curated_post.post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:underline"
            >
              @{reply.curated_post.post_author_handle}
            </a>
            {reply.curated_post.post_created_at && (
              <span className="text-sm text-muted-foreground">
                · {format(new Date(reply.curated_post.post_created_at), 'MMM d, h:mm a')}
              </span>
            )}
          </div>
          {reply.status === 'posted' && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="h-4 w-4" />
              Posted
            </span>
          )}
          {reply.status === 'skipped' && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <X className="h-4 w-4" />
              Skipped
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Original Tweet */}
        <div className="space-y-2">
          <p className="text-sm">{reply.curated_post.post_content}</p>

          {/* Tweet Metrics */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              {mockMetrics.likes}
            </span>
            <span className="flex items-center gap-1">
              <Repeat2 className="h-4 w-4" />
              {mockMetrics.retweets}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {mockMetrics.replies}
            </span>
            {scorePercentage > 0 && (
              <span className="flex items-center gap-1 ml-auto">
                <BarChart3 className="h-4 w-4" />
                Score: {scorePercentage.toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        {/* Suggested Reply */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Suggested Reply</span>
            {!isEditing && reply.status === 'pending' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={isLoading}
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editedReply}
                onChange={(e) => setEditedReply(e.target.value)}
                className="min-h-[100px] resize-none"
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
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm bg-muted/50 rounded-lg p-3">
              {reply.user_edited_reply || reply.suggested_reply}
            </p>
          )}
        </div>
      </CardContent>

      {reply.status === 'pending' && (
        <CardFooter className="flex justify-between pt-3">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={isLoading || isEditing}
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
          <Button
            onClick={handlePost}
            disabled={isLoading || isEditing || editedReply.trim() === ''}
          >
            <Send className="h-4 w-4 mr-1" />
            Post Reply
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
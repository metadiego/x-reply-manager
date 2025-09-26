'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Heart,
  MessageCircle,
  Repeat2,
  BarChart3,
  Twitter,
  X,
  Send,
  Edit2,
  Save,
  Sparkles,
  Clock,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';

interface ModernReplyCardProps {
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

export function ModernReplyCard({ reply, onPost, onReject, onEdit }: ModernReplyCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedReply, setEditedReply] = useState(reply.user_edited_reply || reply.suggested_reply);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [shouldHide, setShouldHide] = useState(false);
  const [showSkippedMessage, setShowSkippedMessage] = useState(false);

  // Hide skipped cards immediately when filter changes
  useEffect(() => {
    if (reply.status === 'skipped') {
      setShouldHide(true);
    }
  }, [reply.status]);

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
    setIsAnimatingOut(true);
    // Show "Post skipped" message immediately as card fades
    setShowSkippedMessage(true);

    // Start collapsing after card fade is complete
    setTimeout(() => {
      setShouldHide(true);
    }, 300); // Wait for fade to complete

    // Complete the reject action
    setTimeout(async () => {
      try {
        await onReject(reply.id);
      } finally {
        setIsLoading(false);
      }
    }, 300);
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

  // Mock engagement metrics
  const mockMetrics = {
    likes: Math.floor(Math.random() * 100),
    retweets: Math.floor(Math.random() * 20),
    replies: Math.floor(Math.random() * 30)
  };

  const scorePercentage = (reply.curated_post.total_score || 0) * 100;

  const isPosted = reply.status === 'posted';
  const isSkipped = reply.status === 'skipped';
  const isPending = reply.status === 'pending';

  // Don't render if animation is complete and is showing "New" filter
  if (shouldHide) {
    return null;
  }

  return (
    <div className={`
      transition-all duration-500 ease-in-out overflow-hidden relative
      ${shouldHide ? 'max-h-0 mb-0 py-0' : 'max-h-[800px] mb-4 py-0'}
    `}>
      {/* Show skipped message overlaying the fading card */}
      {showSkippedMessage && (
        <div className={`
          absolute inset-0 flex items-center justify-center z-10
          transition-all duration-200 ease-in
          ${shouldHide ? 'opacity-0' : 'opacity-100'}
        `}>
          <div className="bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg flex items-center">
            <X className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Post skipped</span>
          </div>
        </div>
      )}

      {/* The card that fades out */}
      <div className={`
        transition-all duration-300 ease-out
        ${isAnimatingOut ? 'opacity-0 pointer-events-none scale-98' : 'opacity-100 scale-100'}
      `}>
        <Card className={`
          overflow-hidden transition-opacity duration-300 ease-out
          ${isPosted ? 'opacity-75' : ''}
          ${isSkipped && !isAnimatingOut ? 'opacity-50' : ''}
        `}>
      {/* Status Badge */}
      {(isPosted || isSkipped) && (
        <div className={`
          px-3 py-1 text-xs font-medium text-white text-center
          ${isPosted ? 'bg-green-500' : 'bg-gray-400'}
        `}>
          {isPosted ? '✓ Reply Posted' : '— Reply Skipped'}
        </div>
      )}

      {/* Tweet Section */}
      <div className="p-6 pb-0">
        {/* Tweet Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={reply.curated_post.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-base hover:underline"
              >
                {reply.curated_post.post_author_handle}
              </a>
              <span className="text-sm text-muted-foreground">
                @{reply.curated_post.post_author_handle}
              </span>
              {reply.curated_post.post_created_at && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(reply.curated_post.post_created_at), 'MMM d, h:mm a')}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            <Twitter className="h-5 w-5 text-blue-500" />
          </div>
        </div>

        {/* Tweet Content */}
        <div className="pl-[60px] mb-4">
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
            {reply.curated_post.post_content}
          </p>
        </div>

        {/* Tweet Metrics */}
        <div className="pl-[60px] flex items-center gap-6 text-sm text-muted-foreground mb-4">
          <span className="flex items-center gap-1.5 hover:text-red-500 transition-colors cursor-pointer">
            <Heart className="h-4 w-4" />
            <span>{mockMetrics.likes}</span>
          </span>
          <span className="flex items-center gap-1.5 hover:text-green-500 transition-colors cursor-pointer">
            <Repeat2 className="h-4 w-4" />
            <span>{mockMetrics.retweets}</span>
          </span>
          <span className="flex items-center gap-1.5 hover:text-blue-500 transition-colors cursor-pointer">
            <MessageCircle className="h-4 w-4" />
            <span>{mockMetrics.replies}</span>
          </span>
          {scorePercentage > 0 && (
            <span className="ml-auto flex items-center gap-1.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded-full">
              <Sparkles className="h-3 w-3" />
              AI Score {scorePercentage.toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 border-t" />

      {/* Reply Section */}
      <div className="p-6">
        {/* Reply Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600" />
            <span className="text-sm font-medium">Your Reply</span>
            {isPending && !isEditing && (
              <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                AI Suggested
              </span>
            )}
          </div>
          {isPending && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>

        {/* Reply Content */}
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editedReply}
              onChange={(e) => setEditedReply(e.target.value)}
              className="min-h-[100px] resize-none text-[15px] border-muted"
              maxLength={280}
              disabled={isLoading}
              placeholder="Write your reply..."
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {editedReply.length}/280 characters
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
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-muted/30 rounded-lg p-4 text-[15px] leading-relaxed">
            {reply.user_edited_reply || reply.suggested_reply}
          </div>
        )}

        {/* Action Buttons */}
        {isPending && !isEditing && (
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleReject}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Skip
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              onClick={handlePost}
              disabled={isLoading || editedReply.trim() === ''}
            >
              <Send className="h-4 w-4 mr-2" />
              Post Reply
            </Button>
          </div>
        )}

        {/* Character count for non-editing state */}
        {!isEditing && isPending && (
          <div className="mt-3 text-xs text-muted-foreground text-center">
            {(reply.user_edited_reply || reply.suggested_reply).length}/280 characters
          </div>
        )}
      </div>
    </Card>
      </div>
    </div>
  );
}
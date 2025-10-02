'use client';

import { useEffect, useState } from 'react';
import { RepliesWithFilters } from './replies-with-filters';
import { refreshPostMetrics } from '@/app/actions/metrics-actions';

interface RepliesListWithRefreshProps {
  initialReplies: any[];
  monitoringTargets: any[];
  onPost: (id: string, replyText: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onEdit: (id: string, newText: string) => Promise<void>;
}

export function RepliesListWithRefresh({
  initialReplies,
  monitoringTargets,
  onPost,
  onReject,
  onEdit,
}: RepliesListWithRefreshProps) {
  const [replies, setReplies] = useState(initialReplies);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Refresh metrics when component mounts
    const refreshMetrics = async () => {
      if (initialReplies.length === 0) return;

      setIsRefreshing(true);

      // Extract curated post IDs from replies
      const curatedPostIds = initialReplies
        .map(reply => reply.curated_post?.id)
        .filter(Boolean);

      try {
        const result = await refreshPostMetrics(curatedPostIds);

        if (result.success) {
          console.log(`✓ Refreshed metrics for ${result.updatedCount} posts`);
          // Optionally reload the page or refetch data here
          // For now, we'll keep the initial data and let the next page load show updated metrics
        } else {
          console.error('Failed to refresh metrics:', result.error);
        }
      } catch (error) {
        console.error('Error refreshing metrics:', error);
      } finally {
        setIsRefreshing(false);
      }
    };

    refreshMetrics();
  }, [initialReplies]);

  return (
    <div className="relative">
      {isRefreshing && (
        <div className="absolute top-0 right-0 z-10 text-xs text-muted-foreground px-3 py-1 bg-background/80 backdrop-blur-sm rounded-md">
          Updating metrics...
        </div>
      )}
      <RepliesWithFilters
        replies={replies}
        monitoringTargets={monitoringTargets}
        onPost={onPost}
        onReject={onReject}
        onEdit={onEdit}
      />
    </div>
  );
}

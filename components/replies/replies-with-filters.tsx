'use client';

import { useState, useMemo } from 'react';
import { ModernRepliesList } from './modern-replies-list';
import { RepliesFilters, FilterState } from './replies-filters';

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
    monitoring_target_id?: string;
    monitoring_targets?: {
      id: string;
      name: string;
    };
  };
}

interface MonitoringTarget {
  id: string;
  name: string;
}

interface RepliesWithFiltersProps {
  replies: Reply[];
  monitoringTargets: MonitoringTarget[];
  onPost: (id: string, replyText: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onEdit: (id: string, newText: string) => Promise<void>;
  isLoading?: boolean;
}

export function RepliesWithFilters({
  replies,
  monitoringTargets,
  onPost,
  onReject,
  onEdit,
  isLoading = false
}: RepliesWithFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    status: 'new',
    targetId: 'all',
    sort: 'recency',
  });

  // Calculate reply counts for each status
  const replyCounts = useMemo(() => {
    const newCount = replies.filter(r => ['pending', 'approved', 'edited'].includes(r.status)).length;
    const skippedCount = replies.filter(r => r.status === 'skipped').length;
    const postedCount = replies.filter(r => r.status === 'posted').length;

    return {
      new: newCount,
      skipped: skippedCount,
      posted: postedCount,
      total: replies.length,
    };
  }, [replies]);

  // Apply filters and sorting
  const filteredAndSortedReplies = useMemo(() => {
    let filtered = [...replies];

    // Apply status filter
    switch (filters.status) {
      case 'new':
        filtered = filtered.filter(r => ['pending', 'approved', 'edited'].includes(r.status));
        break;
      case 'skipped':
        filtered = filtered.filter(r => r.status === 'skipped');
        break;
      case 'posted':
        filtered = filtered.filter(r => r.status === 'posted');
        break;
    }

    // Apply target filter
    if (filters.targetId !== 'all') {
      filtered = filtered.filter(r => r.curated_post.monitoring_target_id === filters.targetId);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (filters.sort === 'score') {
        const scoreA = a.curated_post.total_score || 0;
        const scoreB = b.curated_post.total_score || 0;
        return scoreB - scoreA; // Highest score first
      } else {
        // Sort by recency (created_at)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  }, [replies, filters]);

  return (
    <div>
      <RepliesFilters
        filters={filters}
        onFiltersChange={setFilters}
        targets={monitoringTargets}
        replyCounts={replyCounts}
      />
      <ModernRepliesList
        replies={filteredAndSortedReplies}
        onPost={onPost}
        onReject={onReject}
        onEdit={onEdit}
        isLoading={isLoading}
      />
    </div>
  );
}
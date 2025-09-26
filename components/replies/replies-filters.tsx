'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Archive,
  CheckCircle,
  X,
  Target,
  Clock,
  TrendingUp
} from 'lucide-react';

export type StatusFilter = 'new' | 'skipped' | 'posted';
export type SortOption = 'recency' | 'score';

export interface FilterState {
  status: StatusFilter;
  targetId: string | 'all';
  sort: SortOption;
}

interface MonitoringTarget {
  id: string;
  name: string;
}

interface RepliesFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  targets: MonitoringTarget[];
  replyCounts: {
    new: number;
    skipped: number;
    posted: number;
    total: number;
  };
}

export function RepliesFilters({ filters, onFiltersChange, targets, replyCounts }: RepliesFiltersProps) {
  const statusOptions = [
    {
      value: 'new' as const,
      label: 'New',
      count: replyCounts.new,
      icon: Archive
    },
    {
      value: 'skipped' as const,
      label: 'Skipped',
      count: replyCounts.skipped,
      icon: X
    },
    {
      value: 'posted' as const,
      label: 'Posted',
      count: replyCounts.posted,
      icon: CheckCircle
    },
  ];

  const sortOptions = [
    { value: 'recency' as const, label: 'Most Recent', icon: Clock },
    { value: 'score' as const, label: 'Highest Score', icon: TrendingUp },
  ];


  return (
    <div className="px-4 py-3">
      <Card className="border-0 shadow-sm bg-card/50 backdrop-blur">
        <CardContent className="p-3">
          <div className="space-y-3">
            {/* Status Filter Pills - Horizontal Scrollable on Mobile */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {statusOptions.map((option) => {
                const Icon = option.icon;
                const isActive = filters.status === option.value;
                return (
                  <Button
                    key={option.value}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onFiltersChange({ ...filters, status: option.value })}
                    className={`
                      flex items-center gap-1.5 h-8 px-3 text-xs font-medium whitespace-nowrap
                      ${isActive ? '' : 'hover:bg-muted'}
                    `}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{option.label}</span>
                    <Badge
                      variant={isActive ? 'secondary' : 'outline'}
                      className="text-[10px] h-4 px-1.5 rounded-full ml-1"
                    >
                      {option.count}
                    </Badge>
                  </Button>
                );
              })}
            </div>

            {/* Dropdown Filters Row */}
            <div className="flex items-center gap-2">
              {/* Target Filter */}
              {targets.length > 0 && (
                <Select
                  value={filters.targetId}
                  onValueChange={(value) => onFiltersChange({ ...filters, targetId: value })}
                >
                  <SelectTrigger className="flex-1 max-w-[200px] h-8 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" />
                      <SelectValue placeholder="All targets" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All targets</SelectItem>
                    {targets.map((target) => (
                      <SelectItem key={target.id} value={target.id} className="text-xs">
                        {target.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Sort Options */}
              <Select
                value={filters.sort}
                onValueChange={(value: SortOption) => onFiltersChange({ ...filters, sort: value })}
              >
                <SelectTrigger className="flex-1 max-w-[180px] h-8 text-xs">
                  <div className="flex items-center gap-1.5">
                    {sortOptions.find(opt => opt.value === filters.sort)?.icon && (
                      React.createElement(sortOptions.find(opt => opt.value === filters.sort)!.icon, {
                        className: "h-3.5 w-3.5"
                      })
                    )}
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value} className="text-xs">
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5" />
                          {option.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
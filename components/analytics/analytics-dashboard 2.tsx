'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, MessageCircle, Target, Clock, AlertCircle, Loader2 } from "lucide-react";

interface AnalyticsData {
  today: {
    pendingReview: number;
    skipped: number;
    accepted: number;
    pendingGeneration: number;
  };
  allTime: {
    pendingReview: number;
    skipped: number;
    accepted: number;
    totalCuratedPosts: number;
  };
  metrics: {
    activeTargets: number;
    recentRepliesCount: number;
    weeklyAverage: number;
    responseRate: number;
  };
  timestamp: string;
}

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/analytics');
        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }
        const data = await response.json();
        setAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-muted-foreground">Failed to load analytics</p>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const totalResponses = analytics.allTime.accepted + analytics.allTime.skipped;
  const timeSaved = Math.round(totalResponses * 5 / 60); // Assuming 5 minutes per reply

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.metrics.responseRate}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.allTime.accepted} accepted of {totalResponses} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timeSaved} hours</div>
            <p className="text-xs text-muted-foreground">Estimated all time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Average</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.metrics.weeklyAverage}</div>
            <p className="text-xs text-muted-foreground">Replies per day</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Targets</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.metrics.activeTargets}</div>
            <p className="text-xs text-muted-foreground">Monitoring targets</p>
          </CardContent>
        </Card>
      </div>

      {/* All Time Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>All Time Statistics</CardTitle>
          <CardDescription>
            Your cumulative performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Replies Accepted</span>
                <span className="font-semibold text-green-600">{analytics.allTime.accepted}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Replies Skipped</span>
                <span className="font-semibold text-gray-600">{analytics.allTime.skipped}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pending Review</span>
                <span className="font-semibold text-amber-600">{analytics.allTime.pendingReview}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Curated Posts</span>
                <span className="font-semibold">{analytics.allTime.totalCuratedPosts}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Over Time</CardTitle>
          <CardDescription>
            Engagement metrics visualization
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          <BarChart3 className="h-12 w-12" />
          <span className="ml-2">Chart visualization coming soon</span>
        </CardContent>
      </Card>
    </div>
  );
}
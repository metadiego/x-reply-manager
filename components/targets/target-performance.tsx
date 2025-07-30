"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Calendar, MessageCircle, Target, TrendingUp, Users } from "lucide-react";

interface TargetPerformanceProps {
  targetId: string;
  target: any;
  stats: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TargetPerformance({
  targetId,
  target,
  stats,
  open,
  onOpenChange,
}: TargetPerformanceProps) {
  // Mock performance data - in real implementation, this would come from API
  const performanceData = {
    totalPosts: stats.postsFound,
    repliesGenerated: stats.repliesGenerated,
    avgEngagement: Math.floor(Math.random() * 100) + 50,
    topKeywords: target.topic_targets?.[0]?.keywords?.slice(0, 5) || [],
    recentActivity: [
      { date: '2025-01-29', posts: 12, replies: 5 },
      { date: '2025-01-28', posts: 8, replies: 3 },
      { date: '2025-01-27', posts: 15, replies: 7 },
      { date: '2025-01-26', posts: 6, replies: 2 },
      { date: '2025-01-25', posts: 11, replies: 4 },
    ],
    qualityScore: Math.floor(Math.random() * 30) + 70, // 70-100
    successRate: Math.floor(Math.random() * 20) + 60, // 60-80%
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Target Performance: {target.name}
          </DialogTitle>
          <DialogDescription>
            Detailed analytics and performance metrics for this monitoring target.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  Posts Found
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold">{performanceData.totalPosts}</div>
                <p className="text-xs text-muted-foreground">Last 7 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-green-500" />
                  Replies Generated
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold">{performanceData.repliesGenerated}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((performanceData.repliesGenerated / performanceData.totalPosts) * 100)}% conversion
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  Avg Engagement
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold">{performanceData.avgEngagement}</div>
                <p className="text-xs text-muted-foreground">Likes + retweets + replies</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-orange-500" />
                  Quality Score
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold">{performanceData.qualityScore}%</div>
                <p className="text-xs text-muted-foreground">
                  {performanceData.qualityScore >= 80 ? 'Excellent' : 
                   performanceData.qualityScore >= 70 ? 'Good' : 'Needs improvement'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Target Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Target Configuration</CardTitle>
              <CardDescription>Current settings for this monitoring target</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Type & Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant="outline">
                        {target.target_type === 'topic' ? 'Topic Target' : 'Twitter List'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={target.status === 'active' ? 'default' : 'secondary'}>
                        {target.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{new Date(target.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {target.target_type === 'topic' && target.topic_targets?.[0] && (
                  <div>
                    <h4 className="font-medium mb-2">Search Configuration</h4>
                    <div className="space-y-3">
                      {target.topic_targets[0].keywords?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Keywords</p>
                          <div className="flex flex-wrap gap-1">
                            {target.topic_targets[0].keywords.map((keyword: string) => (
                              <Badge key={keyword} variant="secondary" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {target.topic_targets[0].hashtags?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Hashtags</p>
                          <div className="flex flex-wrap gap-1">
                            {target.topic_targets[0].hashtags.map((hashtag: string) => (
                              <Badge key={hashtag} variant="secondary" className="text-xs">
                                {hashtag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {target.topic_targets[0].min_engagement > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Min Engagement:</span>
                          <span>{target.topic_targets[0].min_engagement}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Daily posts and replies for the last 5 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {performanceData.recentActivity.map((day) => (
                  <div key={day.date} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium">
                        {new Date(day.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-muted-foreground">
                        {day.posts} posts found
                      </div>
                      <div className="text-green-600 font-medium">
                        {day.replies} replies generated
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Insights</CardTitle>
              <CardDescription>AI-generated insights to help optimize this target</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-medium text-green-800 dark:text-green-200 mb-1">✅ Strong Performance</h4>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    This target is finding high-quality posts with good engagement rates. 
                    Reply conversion is above average at {Math.round((performanceData.repliesGenerated / performanceData.totalPosts) * 100)}%.
                  </p>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">💡 Optimization Tip</h4>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Consider adding more specific keywords related to your expertise to improve relevance and increase reply opportunities.
                  </p>
                </div>

                {performanceData.topKeywords.length > 0 && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                    <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-1">🎯 Top Performing Keywords</h4>
                    <p className="text-sm text-purple-600 dark:text-purple-400 mb-2">
                      These keywords are generating the most relevant posts:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {performanceData.topKeywords.map((keyword: string) => (
                        <Badge key={keyword} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
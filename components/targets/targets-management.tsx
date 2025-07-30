"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Plus, Hash, List, Settings, Pause, Play, Archive, MoreHorizontal, BarChart3, Calendar } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CreateTargetDialog } from "./create-target-dialog";
import { EditTargetDialog } from "./edit-target-dialog";
import { TargetPerformance } from "./target-performance";

interface MonitoringTarget {
  id: string;
  name: string;
  target_type: 'topic' | 'twitter_list';
  status: 'active' | 'paused' | 'archived';
  created_at: string;
  updated_at: string;
  topic_targets?: Array<{
    id: string;
    keywords: string[];
    hashtags: string[];
    exclude_keywords: string[];
    min_engagement: number;
    languages: string[];
  }>;
  twitter_list_targets?: Array<{
    id: string;
    twitter_list_id: string;
    list_name: string;
    list_owner_handle: string;
    include_retweets: boolean;
    max_posts_per_day: number;
  }>;
}

interface TargetStats {
  targetId: string;
  postsFound: number;
  repliesGenerated: number;
  lastProcessed: string;
}

interface TargetsManagementProps {
  userId: string;
  initialTargets: MonitoringTarget[];
  targetStats: TargetStats[];
  profile: { daily_digest_time?: string; voice_training_samples?: string[] } | null;
}

export function TargetsManagement({ 
  userId, 
  initialTargets, 
  targetStats 
}: TargetsManagementProps) {
  const [targets, setTargets] = useState<MonitoringTarget[]>(initialTargets);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTarget, setEditingTarget] = useState<MonitoringTarget | null>(null);
  const [showPerformance, setShowPerformance] = useState<string | null>(null);

  const activeTargets = targets.filter(t => t.status === 'active');
  const pausedTargets = targets.filter(t => t.status === 'paused');
  const archivedTargets = targets.filter(t => t.status === 'archived');

  const getTargetStats = (targetId: string) => {
    return targetStats.find(s => s.targetId === targetId);
  };

  const handleStatusChange = async (targetId: string, newStatus: 'active' | 'paused' | 'archived') => {
    // TODO: Implement API call to update target status
    setTargets(prev => prev.map(t => 
      t.id === targetId ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t
    ));
  };

  const handleDeleteTarget = async (targetId: string) => {
    // TODO: Implement API call to delete target
    setTargets(prev => prev.filter(t => t.id !== targetId));
  };

  const renderTarget = (target: MonitoringTarget) => {
    const stats = getTargetStats(target.id);
    const config = target.target_type === 'topic' ? target.topic_targets?.[0] : target.twitter_list_targets?.[0];

    return (
      <Card key={target.id} className="relative">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                target.target_type === 'topic' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
              }`}>
                {target.target_type === 'topic' ? (
                  <Hash className="h-4 w-4" />
                ) : (
                  <List className="h-4 w-4" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">{target.name}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Badge variant={target.status === 'active' ? 'default' : target.status === 'paused' ? 'secondary' : 'outline'}>
                    {target.status}
                  </Badge>
                  <span className="text-xs">
                    {target.target_type === 'topic' ? 'Topic Target' : 'Twitter List'}
                  </span>
                </CardDescription>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditingTarget(target)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Target
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowPerformance(target.id)}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Performance
                </DropdownMenuItem>
                {target.status === 'active' ? (
                  <DropdownMenuItem onClick={() => handleStatusChange(target.id, 'paused')}>
                    <Pause className="mr-2 h-4 w-4" />
                    Pause Target
                  </DropdownMenuItem>
                ) : target.status === 'paused' ? (
                  <DropdownMenuItem onClick={() => handleStatusChange(target.id, 'active')}>
                    <Play className="mr-2 h-4 w-4" />
                    Resume Target
                  </DropdownMenuItem>
                ) : null}
                {target.status !== 'archived' && (
                  <DropdownMenuItem onClick={() => handleStatusChange(target.id, 'archived')}>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive Target
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => handleDeleteTarget(target.id)}
                >
                  Delete Target
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Target Configuration Display */}
          {target.target_type === 'topic' && config && (
            <div className="space-y-3">
              {config.keywords && config.keywords.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Keywords</p>
                  <div className="flex flex-wrap gap-1">
                    {config.keywords.slice(0, 3).map((keyword: string) => (
                      <Badge key={keyword} variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                    {config.keywords.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{config.keywords.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {config.hashtags && config.hashtags.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Hashtags</p>
                  <div className="flex flex-wrap gap-1">
                    {config.hashtags.slice(0, 3).map((hashtag: string) => (
                      <Badge key={hashtag} variant="secondary" className="text-xs">
                        {hashtag}
                      </Badge>
                    ))}
                    {config.hashtags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{config.hashtags.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {target.target_type === 'twitter_list' && config && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">List:</span>
                <span className="font-medium">{config.list_name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Owner:</span>
                <span>@{config.list_owner_handle}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Daily Limit:</span>
                <span>{config.max_posts_per_day} posts</span>
              </div>
            </div>
          )}

          {/* Performance Stats */}
          {stats && (
            <div className="pt-3 border-t space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-medium">{stats.postsFound}</div>
                  <div className="text-muted-foreground text-xs">Posts Found</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">{stats.repliesGenerated}</div>
                  <div className="text-muted-foreground text-xs">Replies Generated</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Last processed: {new Date(stats.lastProcessed).toLocaleDateString()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (targets.length === 0) {
    return (
      <div className="space-y-6">
        {/* Quick Setup Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowCreateDialog(true)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Topic Monitoring
              </CardTitle>
              <CardDescription>
                Monitor tweets based on keywords and hashtags
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Track conversations around specific topics by setting keywords and hashtags to monitor.
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Add relevant keywords</li>
                  <li>• Include hashtags to track</li>
                  <li>• Set engagement thresholds</li>
                  <li>• Filter out unwanted content</li>
                </ul>
              </div>
              
              <Button className="w-full" variant="outline">
                <Hash className="mr-2 h-4 w-4" />
                Create Topic Target
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow opacity-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                Twitter List Monitoring
              </CardTitle>
              <CardDescription>
                Monitor tweets from your Twitter lists (Coming Soon)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Keep track of posts from curated Twitter lists you follow or own.
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Select from your Twitter lists</li>
                  <li>• Control retweet inclusion</li>
                  <li>• Set daily post limits</li>
                  <li>• Focus on quality content</li>
                </ul>
              </div>
              
              <Button className="w-full" variant="outline" disabled>
                <List className="mr-2 h-4 w-4" />
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Empty State */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No monitoring targets yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Create your first monitoring target to start receiving curated posts in your daily digest.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Target
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{activeTargets.length} active</span>
            {pausedTargets.length > 0 && <span>{pausedTargets.length} paused</span>}
            {archivedTargets.length > 0 && <span>{archivedTargets.length} archived</span>}
          </div>
        </div>
        
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Target
        </Button>
      </div>

      {/* Active Targets */}
      {activeTargets.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Active Targets</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeTargets.map(renderTarget)}
          </div>
        </div>
      )}

      {/* Paused Targets */}
      {pausedTargets.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Paused Targets</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pausedTargets.map(renderTarget)}
          </div>
        </div>
      )}

      {/* Archived Targets */}
      {archivedTargets.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Archived Targets</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {archivedTargets.map(renderTarget)}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateTargetDialog
        userId={userId}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onTargetCreated={(newTarget) => {
          setTargets(prev => [newTarget, ...prev]);
          setShowCreateDialog(false);
        }}
      />

      {editingTarget && (
        <EditTargetDialog
          target={editingTarget}
          open={!!editingTarget}
          onOpenChange={(open) => !open && setEditingTarget(null)}
          onTargetUpdated={(updatedTarget) => {
            setTargets(prev => prev.map(t => t.id === updatedTarget.id ? updatedTarget : t));
            setEditingTarget(null);
          }}
        />
      )}

      {showPerformance && (
        <TargetPerformance
          targetId={showPerformance}
          target={targets.find(t => t.id === showPerformance)!}
          stats={getTargetStats(showPerformance)!}
          open={!!showPerformance}
          onOpenChange={(open) => !open && setShowPerformance(null)}
        />
      )}
    </div>
  );
}
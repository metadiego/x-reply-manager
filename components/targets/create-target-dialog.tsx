"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Hash, List, X, Loader2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

interface CreateTargetDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTargetCreated: (target: MonitoringTarget) => void;
}

export function CreateTargetDialog({
  userId,
  open,
  onOpenChange,
  onTargetCreated,
}: CreateTargetDialogProps) {
  const [activeTab, setActiveTab] = useState("topic");
  const [isLoading, setIsLoading] = useState(false);
  
  // Topic target state
  const [topicName, setTopicName] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [excludeKeywords, setExcludeKeywords] = useState<string[]>([]);
  const [minEngagement, setMinEngagement] = useState(0);
  const [description, setDescription] = useState("");

  // Twitter list target state (for future implementation)
  // const [listName, setListName] = useState("");
  // const [maxPostsPerDay, setMaxPostsPerDay] = useState(50);

  const supabase = createClient();

  const addKeyword = (keyword: string) => {
    if (!keyword.trim() || keywords.includes(keyword.trim())) return;
    setKeywords([...keywords, keyword.trim()]);
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const addHashtag = (hashtag: string) => {
    if (!hashtag.trim()) return;
    const formatted = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
    if (hashtags.includes(formatted)) return;
    setHashtags([...hashtags, formatted]);
  };

  const removeHashtag = (hashtag: string) => {
    setHashtags(hashtags.filter(h => h !== hashtag));
  };

  const addExcludeKeyword = (keyword: string) => {
    if (!keyword.trim() || excludeKeywords.includes(keyword.trim())) return;
    setExcludeKeywords([...excludeKeywords, keyword.trim()]);
  };

  const removeExcludeKeyword = (keyword: string) => {
    setExcludeKeywords(excludeKeywords.filter(k => k !== keyword));
  };

  const resetForm = () => {
    setTopicName("");
    setKeywords([]);
    setHashtags([]);
    setExcludeKeywords([]);
    setMinEngagement(0);
    setDescription("");
    setListName("");
    setMaxPostsPerDay(50);
    setActiveTab("topic");
  };

  const handleCreateTarget = async () => {
    if (!topicName.trim() || (keywords.length === 0 && hashtags.length === 0)) {
      alert("Please provide a target name and at least one keyword or hashtag.");
      return;
    }

    setIsLoading(true);
    try {
      console.log('Creating monitoring target:', {
        user_id: userId,
        name: topicName.trim(),
        target_type: 'topic',
        status: 'active'
      });

      // Create monitoring target
      const { data: monitoringTarget, error: targetError } = await supabase
        .from('monitoring_targets')
        .insert({
          user_id: userId,
          name: topicName.trim(),
          target_type: 'topic',
          status: 'active'
        })
        .select()
        .single();

      if (targetError) {
        console.error('Error creating monitoring target:', targetError);
        throw targetError;
      }

      console.log('Created monitoring target:', monitoringTarget);

      // Create topic configuration
      const topicConfig = {
        monitoring_target_id: monitoringTarget.id,
        keywords: keywords.length > 0 ? keywords : [],
        hashtags: hashtags.length > 0 ? hashtags : [],
        exclude_keywords: excludeKeywords.length > 0 ? excludeKeywords : [],
        min_engagement: minEngagement,
        languages: ['en']
      };

      console.log('Creating topic configuration:', topicConfig);

      const { data: topicTarget, error: topicError } = await supabase
        .from('topic_targets')
        .insert(topicConfig)
        .select()
        .single();

      if (topicError) {
        console.error('Error creating topic configuration:', topicError);
        throw topicError;
      }

      console.log('Created topic configuration:', topicTarget);

      // Combine the data for the parent component
      const newTarget = {
        ...monitoringTarget,
        topic_targets: [topicTarget]
      };

      onTargetCreated(newTarget);
      resetForm();
    } catch (error) {
      console.error('Error creating target:', error);
      alert(`Failed to create target: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  // Quick topic suggestions
  const suggestedTopics = [
    { name: "AI & Machine Learning", keywords: ["artificial intelligence", "machine learning", "AI", "ML"], hashtags: ["#AI", "#MachineLearning", "#ArtificialIntelligence"] },
    { name: "Tech Industry News", keywords: ["technology", "startup", "innovation", "tech news"], hashtags: ["#Tech", "#Startup", "#Innovation", "#TechNews"] },
    { name: "Web Development", keywords: ["web development", "frontend", "backend", "javascript"], hashtags: ["#WebDev", "#Frontend", "#Backend", "#JavaScript"] },
    { name: "Data Science", keywords: ["data science", "analytics", "big data", "data analysis"], hashtags: ["#DataScience", "#Analytics", "#BigData"] }
  ];

  const applySuggestedTopic = (topic: typeof suggestedTopics[0]) => {
    setTopicName(topic.name);
    setKeywords(topic.keywords);
    setHashtags(topic.hashtags);
    setDescription(`Monitor discussions about ${topic.name.toLowerCase()}`);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Monitoring Target</DialogTitle>
          <DialogDescription>
            Set up a new target to monitor Twitter conversations and receive relevant posts in your daily digest.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="topic" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Topic Target
            </TabsTrigger>
            <TabsTrigger value="list" disabled className="flex items-center gap-2 opacity-50">
              <List className="h-4 w-4" />
              Twitter List (Coming Soon)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="topic" className="space-y-6">
            {/* Quick Suggestions */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Quick Start</Label>
              <div className="grid grid-cols-2 gap-2">
                {suggestedTopics.map((topic, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => applySuggestedTopic(topic)}
                    className="justify-start h-auto p-3 text-left"
                  >
                    <div>
                      <div className="font-medium text-xs">{topic.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {topic.hashtags.slice(0, 2).join(', ')}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Target Name */}
            <div className="space-y-2">
              <Label htmlFor="targetName">Target Name *</Label>
              <Input
                id="targetName"
                placeholder="e.g., AI Industry Discussions"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
              />
            </div>

            {/* Keywords */}
            <div className="space-y-2">
              <Label>Keywords *</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="gap-1">
                    {keyword}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeKeyword(keyword)}
                    />
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Add keyword and press Enter"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addKeyword(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Keywords help find relevant tweets. Add terms like "artificial intelligence", "startup", etc.
              </p>
            </div>

            {/* Hashtags */}
            <div className="space-y-2">
              <Label>Hashtags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {hashtags.map((hashtag) => (
                  <Badge key={hashtag} variant="secondary" className="gap-1">
                    {hashtag}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeHashtag(hashtag)}
                    />
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Add hashtag and press Enter (# is optional)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addHashtag(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Hashtags help find specific conversations. Add tags like "#AI", "#startup", etc.
              </p>
            </div>

            {/* Advanced Options */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium">Advanced Options</h4>
              
              {/* Exclude Keywords */}
              <div className="space-y-2">
                <Label>Exclude Keywords</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {excludeKeywords.map((keyword) => (
                    <Badge key={keyword} variant="destructive" className="gap-1">
                      {keyword}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeExcludeKeyword(keyword)}
                      />
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder="Add words to exclude and press Enter"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addExcludeKeyword(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Filter out posts containing these terms (e.g., "crypto", "NFT")
                </p>
              </div>

              {/* Minimum Engagement */}
              <div className="space-y-2">
                <Label htmlFor="minEngagement">Minimum Engagement</Label>
                <Input
                  id="minEngagement"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={minEngagement}
                  onChange={(e) => setMinEngagement(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Only include posts with at least this many likes + retweets + replies
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of what you're looking for..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            <div className="text-center py-8">
              <List className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Twitter List Monitoring</h3>
              <p className="text-muted-foreground mb-4">
                This feature is coming soon! You'll be able to monitor posts from your Twitter lists.
              </p>
              <p className="text-sm text-muted-foreground">
                For now, use Topic Targets to monitor keywords and hashtags.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => handleClose(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateTarget}
            disabled={isLoading || !topicName.trim() || (keywords.length === 0 && hashtags.length === 0)}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Target
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
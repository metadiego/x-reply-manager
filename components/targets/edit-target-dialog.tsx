"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { X, Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface EditTargetDialogProps {
  target: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTargetUpdated: (target: any) => void;
}

export function EditTargetDialog({
  target,
  open,
  onOpenChange,
  onTargetUpdated,
}: EditTargetDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [targetName, setTargetName] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [excludeKeywords, setExcludeKeywords] = useState<string[]>([]);
  const [minEngagement, setMinEngagement] = useState(0);

  const supabase = createClient();

  // Load target data when dialog opens
  useEffect(() => {
    if (target && open) {
      setTargetName(target.name || "");
      
      const topicConfig = target.topic_targets?.[0];
      if (topicConfig) {
        setKeywords(topicConfig.keywords || []);
        setHashtags(topicConfig.hashtags || []);
        setExcludeKeywords(topicConfig.exclude_keywords || []);
        setMinEngagement(topicConfig.min_engagement || 0);
      }
    }
  }, [target, open]);

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

  const handleUpdateTarget = async () => {
    if (!targetName.trim() || (keywords.length === 0 && hashtags.length === 0)) {
      alert("Please provide a target name and at least one keyword or hashtag.");
      return;
    }

    setIsLoading(true);
    try {
      // Update monitoring target name
      const { data: updatedTarget, error: targetError } = await supabase
        .from('monitoring_targets')
        .update({
          name: targetName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', target.id)
        .select()
        .single();

      if (targetError) {
        console.error('Error updating monitoring target:', targetError);
        throw targetError;
      }

      // Update topic configuration
      const topicConfig = target.topic_targets?.[0];
      if (topicConfig) {
        const { data: updatedTopicConfig, error: topicError } = await supabase
          .from('topic_targets')
          .update({
            keywords: keywords.length > 0 ? keywords : [],
            hashtags: hashtags.length > 0 ? hashtags : [],
            exclude_keywords: excludeKeywords.length > 0 ? excludeKeywords : [],
            min_engagement: minEngagement,
            updated_at: new Date().toISOString()
          })
          .eq('id', topicConfig.id)
          .select()
          .single();

        if (topicError) {
          console.error('Error updating topic configuration:', topicError);
          throw topicError;
        }

        // Combine the updated data
        const finalTarget = {
          ...updatedTarget,
          topic_targets: [updatedTopicConfig]
        };

        onTargetUpdated(finalTarget);
      }
    } catch (error) {
      console.error('Error updating target:', error);
      alert(`Failed to update target: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Monitoring Target</DialogTitle>
          <DialogDescription>
            Update your monitoring target settings to refine the posts you receive.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Target Name */}
          <div className="space-y-2">
            <Label htmlFor="targetName">Target Name *</Label>
            <Input
              id="targetName"
              placeholder="e.g., AI Industry Discussions"
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
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
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateTarget}
            disabled={isLoading || !targetName.trim() || (keywords.length === 0 && hashtags.length === 0)}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update Target
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
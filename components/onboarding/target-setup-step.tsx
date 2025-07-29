"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Hash, List, X, CheckCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface TargetSetupStepProps {
  userId: string;
  onComplete: () => void;
  targetsCount: number;
}

export function TargetSetupStep({ userId, onComplete, targetsCount }: TargetSetupStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("topics");
  const [topicTargets, setTopicTargets] = useState([
    { name: "", keywords: [], hashtags: [], description: "" }
  ]);
  const [suggestedTopics] = useState([
    { name: "AI & Machine Learning", keywords: ["artificial intelligence", "machine learning", "AI"], hashtags: ["#AI", "#MachineLearning", "#ArtificialIntelligence"] },
    { name: "Tech Industry News", keywords: ["technology", "startup", "innovation"], hashtags: ["#Tech", "#Startup", "#Innovation"] },
    { name: "Web Development", keywords: ["web development", "frontend", "backend"], hashtags: ["#WebDev", "#Frontend", "#Backend"] },
    { name: "Data Science", keywords: ["data science", "analytics", "big data"], hashtags: ["#DataScience", "#Analytics", "#BigData"] }
  ]);

  const supabase = createClient();

  const addKeyword = (targetIndex: number, keyword: string) => {
    if (!keyword.trim()) return;
    
    const updated = [...topicTargets];
    if (!updated[targetIndex].keywords.includes(keyword)) {
      updated[targetIndex].keywords.push(keyword);
      setTopicTargets(updated);
    }
  };

  const removeKeyword = (targetIndex: number, keyword: string) => {
    const updated = [...topicTargets];
    updated[targetIndex].keywords = updated[targetIndex].keywords.filter(k => k !== keyword);
    setTopicTargets(updated);
  };

  const addHashtag = (targetIndex: number, hashtag: string) => {
    if (!hashtag.trim()) return;
    
    const formatted = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
    const updated = [...topicTargets];
    if (!updated[targetIndex].hashtags.includes(formatted)) {
      updated[targetIndex].hashtags.push(formatted);
      setTopicTargets(updated);
    }
  };

  const removeHashtag = (targetIndex: number, hashtag: string) => {
    const updated = [...topicTargets];
    updated[targetIndex].hashtags = updated[targetIndex].hashtags.filter(h => h !== hashtag);
    setTopicTargets(updated);
  };

  const applySuggestedTopic = (topic: any) => {
    const updated = [...topicTargets];
    updated[0] = {
      name: topic.name,
      keywords: [...topic.keywords],
      hashtags: [...topic.hashtags],
      description: `Monitor discussions about ${topic.name.toLowerCase()}`
    };
    setTopicTargets(updated);
  };

  const handleSaveTargets = async () => {
    setIsLoading(true);
    try {
      console.log('Starting to save targets for user:', userId);
      console.log('Topic targets to save:', topicTargets);

      // Ensure user profile exists first
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('users_profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (profileCheckError && profileCheckError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('Creating user profile for:', userId);
        const { error: profileCreateError } = await supabase
          .from('users_profiles')
          .insert({ id: userId });
        
        if (profileCreateError) {
          console.error('Error creating user profile:', profileCreateError);
          throw profileCreateError;
        }
      } else if (profileCheckError) {
        console.error('Error checking user profile:', profileCheckError);
        throw profileCheckError;
      } else {
        console.log('User profile exists:', existingProfile);
      }

      // Save each topic target
      for (const target of topicTargets) {
        if (!target.name.trim()) {
          console.log('Skipping empty target');
          continue;
        }

        console.log('Creating monitoring target:', {
          user_id: userId,
          name: target.name,
          target_type: 'topic',
          status: 'active'
        });

        // Create monitoring target
        const { data: monitoringTarget, error: targetError } = await supabase
          .from('monitoring_targets')
          .insert({
            user_id: userId,
            name: target.name,
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

        console.log('Creating topic configuration:', {
          monitoring_target_id: monitoringTarget.id,
          keywords: target.keywords,
          hashtags: target.hashtags,
          exclude_keywords: [],
          min_engagement: 0,
          languages: ['en']
        });

        // Create topic configuration
        const { data: topicConfig, error: topicError } = await supabase
          .from('topic_targets')
          .insert({
            monitoring_target_id: monitoringTarget.id,
            keywords: target.keywords,
            hashtags: target.hashtags,
            exclude_keywords: [],
            min_engagement: 0,
            languages: ['en']
          })
          .select();

        if (topicError) {
          console.error('Error creating topic configuration:', topicError);
          throw topicError;
        }

        console.log('Created topic configuration:', topicConfig);
      }

      console.log('All targets saved successfully');
      onComplete();
    } catch (error) {
      console.error('Error saving targets:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Show user-friendly error message
      alert(`Failed to save targets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (targetsCount > 0) {
    return (
      <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <div>
          <p className="font-medium text-green-800 dark:text-green-200">
            Monitoring targets configured!
          </p>
          <p className="text-sm text-green-600 dark:text-green-400">
            You have {targetsCount} active monitoring target{targetsCount > 1 ? 's' : ''} set up.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          Smart Discovery
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
          Get started quickly with these suggested topics based on common professional interests:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {suggestedTopics.map((topic, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => applySuggestedTopic(topic)}
              className="justify-start h-auto p-3"
            >
              <div className="text-left">
                <div className="font-medium">{topic.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {topic.hashtags.slice(0, 3).join(', ')}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="topics">
            <Hash className="h-4 w-4 mr-2" />
            Topics & Keywords
          </TabsTrigger>
          <TabsTrigger value="lists" disabled>
            <List className="h-4 w-4 mr-2" />
            Twitter Lists (Coming Soon)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="topics" className="space-y-4">
          {topicTargets.map((target, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg">Topic Target {index + 1}</CardTitle>
                <CardDescription>
                  Define keywords and hashtags to monitor for engagement opportunities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`name-${index}`}>Target Name</Label>
                  <Input
                    id={`name-${index}`}
                    placeholder="e.g., AI Industry Discussions"
                    value={target.name}
                    onChange={(e) => {
                      const updated = [...topicTargets];
                      updated[index].name = e.target.value;
                      setTopicTargets(updated);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Keywords</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {target.keywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="gap-1">
                        {keyword}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeKeyword(index, keyword)}
                        />
                      </Badge>
                    ))}
                  </div>
                  <Input
                    placeholder="Add keyword and press Enter"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addKeyword(index, e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Hashtags</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {target.hashtags.map((hashtag) => (
                      <Badge key={hashtag} variant="secondary" className="gap-1">
                        {hashtag}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeHashtag(index, hashtag)}
                        />
                      </Badge>
                    ))}
                  </div>
                  <Input
                    placeholder="Add hashtag and press Enter (# is optional)"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addHashtag(index, e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`description-${index}`}>Description (Optional)</Label>
                  <Textarea
                    id={`description-${index}`}
                    placeholder="Brief description of what you're looking for..."
                    value={target.description}
                    onChange={(e) => {
                      const updated = [...topicTargets];
                      updated[index].description = e.target.value;
                      setTopicTargets(updated);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-center pt-4">
            <Button 
              onClick={handleSaveTargets} 
              disabled={isLoading || !topicTargets[0].name.trim()}
              className="min-w-32"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Targets"
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
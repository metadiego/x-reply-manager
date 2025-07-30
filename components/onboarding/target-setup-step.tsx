"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Hash, List, X, CheckCircle, Loader2 } from "lucide-react";
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

  const applySuggestedTopic = (topic: { name: string; keywords: string[]; hashtags: string[] }) => {
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
      console.log('=== STARTING TARGET SAVE PROCESS ===');
      console.log('User ID:', userId);
      console.log('Topic targets to save:', topicTargets);

      // First, get the current user to ensure we have proper authentication
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Authentication error:', userError);
        throw new Error('Authentication failed. Please refresh the page and try again.');
      }
      console.log('Authenticated user:', { id: user.id, email: user.email });

      // Check if user profile exists - with better error handling
      console.log('Checking for user profile...');
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('users_profiles')
        .select('id, created_at')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid error on missing record

      console.log('Profile check result:', { existingProfile, profileCheckError });

      if (!existingProfile && !profileCheckError) {
        // Profile doesn't exist, create it
        console.log('Creating user profile for:', userId);
        const { data: newProfile, error: profileCreateError } = await supabase
          .from('users_profiles')
          .insert({ 
            id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id, created_at')
          .single();
        
        if (profileCreateError) {
          console.error('Error creating user profile:', profileCreateError);
          console.error('Profile create error details:', {
            code: profileCreateError.code,
            message: profileCreateError.message,
            details: profileCreateError.details,
            hint: profileCreateError.hint
          });
          throw new Error(`Failed to create user profile: ${profileCreateError.message}`);
        }
        console.log('Created user profile:', newProfile);
      } else if (profileCheckError) {
        console.error('Error checking user profile:', profileCheckError);
        throw new Error(`Database error: ${profileCheckError.message}`);
      } else {
        console.log('User profile exists:', existingProfile);
      }

      // Verify we can write to monitoring_targets by testing permissions
      console.log('Testing monitoring_targets permissions...');
      const { error: permissionError } = await supabase
        .from('monitoring_targets')
        .select('count')
        .eq('user_id', userId)
        .limit(1);
      
      if (permissionError) {
        console.error('Permission test failed:', permissionError);
        throw new Error(`Database permission error: ${permissionError.message}`);
      }
      console.log('Permissions test passed');

      // Save each topic target
      for (const [index, target] of topicTargets.entries()) {
        if (!target.name.trim()) {
          console.log(`Skipping empty target at index ${index}`);
          continue;
        }

        console.log(`=== SAVING TARGET ${index + 1} ===`);
        console.log('Target data:', {
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
            name: target.name.trim(),
            target_type: 'topic',
            status: 'active'
          })
          .select('id, name, created_at')
          .single();

        if (targetError) {
          console.error('Error creating monitoring target:', targetError);
          console.error('Target error details:', {
            code: targetError.code,
            message: targetError.message,
            details: targetError.details,
            hint: targetError.hint
          });
          throw new Error(`Failed to create monitoring target: ${targetError.message}`);
        }

        console.log('✅ Created monitoring target:', monitoringTarget);

        // Create topic configuration
        console.log('Creating topic configuration for target:', monitoringTarget.id);
        const { data: topicConfig, error: topicError } = await supabase
          .from('topic_targets')
          .insert({
            monitoring_target_id: monitoringTarget.id,
            keywords: target.keywords.length > 0 ? target.keywords : [],
            hashtags: target.hashtags.length > 0 ? target.hashtags : [],
            exclude_keywords: [],
            min_engagement: 0,
            languages: ['en']
          })
          .select('id, keywords, hashtags')
          .single();

        if (topicError) {
          console.error('Error creating topic configuration:', topicError);
          console.error('Topic config error details:', {
            code: topicError.code,
            message: topicError.message,
            details: topicError.details,
            hint: topicError.hint
          });
          throw new Error(`Failed to create topic configuration: ${topicError.message}`);
        }

        console.log('✅ Created topic configuration:', topicConfig);
      }

      console.log('🎉 All targets saved successfully!');
      onComplete();
    } catch (error) {
      console.error('❌ Error saving targets:', error);
      
      // More detailed error logging
      if (error && typeof error === 'object') {
        console.error('Full error object:', JSON.stringify(error, null, 2));
      }
      
      // Show detailed user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to save targets: ${errorMessage}\n\nPlease check the browser console for detailed error information and try again.`);
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
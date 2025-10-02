"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Loader2, Sparkles, Hash, TrendingUp, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface TopicSuggestion {
  name: string;
  keywords: string[];
  hashtags: string[];
  confidence: number;
  reason: string;
  relatedPosts: string[];
}

interface VoiceAnalysis {
  sampleTweets: string[];
  voicePersonality: string;
  communicationStyle: string;
  interests: string[];
}

export default function CreateTargetPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [topicSuggestions, setTopicSuggestions] = useState<TopicSuggestion[]>([]);
  const [voiceAnalysis, setVoiceAnalysis] = useState<VoiceAnalysis | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<Set<number>>(new Set());
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  // Run analysis automatically when component mounts
  useEffect(() => {
    analyzeTwitterProfile();
  }, []);

  const analyzeTwitterProfile = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/twitter/analyze-onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to analyze Twitter profile");
      }

      const data = await response.json();

      if (data.success) {
        setTopicSuggestions(data.topicAnalysis.topicSuggestions || []);
        setVoiceAnalysis(data.voiceAnalysis.voiceProfile || null);
        setHasAnalyzed(true);

        // Auto-select high confidence topics
        const autoSelected = new Set<number>();
        data.topicAnalysis.topicSuggestions?.forEach((topic: TopicSuggestion, index: number) => {
          if (topic.confidence >= 0.8) {
            autoSelected.add(index);
          }
        });
        setSelectedTopics(autoSelected);

        if (!data.topicAnalysis.hasRealData) {
          toast.info("Using default suggestions. Connect your Twitter account for personalized recommendations.");
        }
      }
    } catch (error) {
      console.error("Error analyzing Twitter profile:", error);
      toast.error("Failed to analyze Twitter profile. Using default suggestions.");

      // Set default suggestions on error
      setTopicSuggestions([
        {
          name: "AI & Machine Learning",
          keywords: ["artificial intelligence", "machine learning", "deep learning", "neural networks", "AI"],
          hashtags: ["#AI", "#MachineLearning", "#DeepLearning", "#ArtificialIntelligence"],
          confidence: 0.7,
          reason: "Popular tech topic with high engagement",
          relatedPosts: []
        },
        {
          name: "Web Development",
          keywords: ["web development", "javascript", "react", "frontend", "backend"],
          hashtags: ["#WebDev", "#JavaScript", "#ReactJS", "#100DaysOfCode"],
          confidence: 0.7,
          reason: "Active developer community",
          relatedPosts: []
        }
      ]);
      setHasAnalyzed(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleTopicSelection = (index: number) => {
    const newSelected = new Set(selectedTopics);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTopics(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedTopics.size === 0) {
      toast.error("Please select at least one topic to monitor");
      return;
    }

    if (!session?.user) {
      toast.error("You must be logged in to create targets");
      router.push("/auth/login");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const userId = session.user.id;

    try {

      // Create monitoring targets based on selected topics
      const selectedTopicsList = Array.from(selectedTopics).map(index => topicSuggestions[index]);

      for (const topic of selectedTopicsList) {
        // Create the monitoring target
        const { data: targetData, error: targetError } = await supabase
          .from("monitoring_targets")
          .insert({
            user_id: userId,
            name: topic.name,
            target_type: "topic",
            status: "active"
          })
          .select()
          .single();

        if (targetError) {
          console.error("Error creating monitoring target:", targetError);
          toast.error(`Failed to create target for ${topic.name}`);
          continue;
        }

        // Create topic-specific configuration
        const { error: topicError } = await supabase
          .from("topic_targets")
          .insert({
            monitoring_target_id: targetData.id,
            keywords: topic.keywords,
            hashtags: topic.hashtags,
            min_engagement: 10,
            languages: ["en"]
          });

        if (topicError) {
          console.error("Error creating topic configuration:", topicError);
          toast.error(`Failed to configure topic ${topic.name}`);
        }
      }

      // Save voice analysis if available
      if (voiceAnalysis) {
        const { error: voiceError } = await supabase
          .from("users_profiles")
          .update({
            voice_training_samples: voiceAnalysis.sampleTweets
          })
          .eq("id", userId);

        if (voiceError) {
          console.error("Error saving voice profile:", voiceError);
        }
      }

      toast.success("Monitoring targets created successfully!");
      router.push("/onboarding/voice-profile");
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while creating targets");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
      <div className="text-center space-y-4 max-w-lg">
        <h1 className="text-3xl font-bold">Create Your First Targets</h1>
        <p className="text-muted-foreground">
          {isAnalyzing
            ? "Analyzing your Twitter profile to suggest personalized topics..."
            : "Select topics you'd like to monitor for engagement opportunities."}
        </p>
      </div>

      {isAnalyzing ? (
        <Card className="w-full max-w-2xl">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg font-medium">Analyzing your Twitter profile...</p>
            <p className="text-sm text-muted-foreground">
              We&apos;re looking at your recent tweets to understand your interests and voice
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Suggested Topics
            </CardTitle>
            <CardDescription>
              {hasAnalyzed && topicSuggestions.length > 0
                ? "Based on your Twitter activity, we recommend monitoring these topics:"
                : "Select topics that align with your interests and expertise:"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topicSuggestions.map((topic, index) => (
              <Card
                key={index}
                className={`cursor-pointer transition-all ${
                  selectedTopics.has(index)
                    ? "ring-2 ring-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => toggleTopicSelection(index)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{topic.name}</h3>
                        {topic.confidence >= 0.8 && (
                          <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">
                            High Match
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{topic.reason}</p>

                      <div className="flex flex-wrap gap-2 mt-2">
                        {topic.keywords.slice(0, 3).map((keyword, kidx) => (
                          <span
                            key={kidx}
                            className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded"
                          >
                            <TrendingUp className="h-3 w-3" />
                            {keyword}
                          </span>
                        ))}
                        {topic.hashtags.slice(0, 2).map((hashtag, hidx) => (
                          <span
                            key={hidx}
                            className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-600 px-2 py-1 rounded"
                          >
                            <Hash className="h-3 w-3" />
                            {hashtag.substring(1,)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedTopics.has(index)
                          ? "bg-primary border-primary"
                          : "border-muted-foreground"
                      }`}>
                        {selectedTopics.has(index) && (
                          <span className="text-white text-xs">✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {topicSuggestions.length === 0 && !isAnalyzing && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No topic suggestions available.</p>
                <Button
                  variant="outline"
                  onClick={analyzeTwitterProfile}
                  className="mt-4"
                >
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <div className="flex space-x-1">
          <div className="w-8 h-1 bg-muted rounded-full" />
          <div className="w-8 h-1 bg-primary rounded-full" />
          <div className="w-8 h-1 bg-muted rounded-full" />
        </div>
        <span>Step 2 of 3</span>
      </div>

      <div className="flex gap-4">
        <Button variant="outline" asChild>
          <Link href="/onboarding" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading || isAnalyzing || selectedTopics.size === 0}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
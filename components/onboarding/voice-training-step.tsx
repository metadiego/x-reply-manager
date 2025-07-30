"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Brain, Twitter, Loader2, RefreshCw, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface VoiceTrainingStepProps {
  userId: string;
  profile: any;
  onComplete: () => void;
}

interface TwitterAnalysis {
  tweetCount: number;
  avgLength: number;
  commonWords: string[];
  tone: 'professional' | 'casual' | 'technical' | 'friendly';
  style: string[];
  sampleTweets: string[];
}

export function VoiceTrainingStep({ userId, profile, onComplete }: VoiceTrainingStepProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<TwitterAnalysis | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingComplete, setTrainingComplete] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    // Check if voice training is already complete
    if (profile?.voice_training_samples && profile.voice_training_samples.length > 0) {
      setTrainingComplete(true);
    }
  }, [profile]);

  const analyzeTwitterHistory = async () => {
    setIsAnalyzing(true);
    try {
      // Simulate Twitter API analysis (in real implementation, this would call Twitter API)
      // For now, we'll simulate the analysis
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockAnalysis: TwitterAnalysis = {
        tweetCount: 47,
        avgLength: 142,
        commonWords: ["technology", "development", "AI", "startup", "innovation"],
        tone: "professional",
        style: ["informative", "question-asking", "value-adding"],
        sampleTweets: [
          "Just discovered an interesting approach to handling async state in React. The key is managing loading states properly...",
          "What's your experience with implementing real-time features? Looking at WebSockets vs Server-Sent Events...",
          "The intersection of AI and traditional software development is fascinating. We're seeing paradigm shifts in how we build products."
        ]
      };
      
      setAnalysis(mockAnalysis);
    } catch (error) {
      console.error('Error analyzing Twitter history:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runVoiceTraining = async () => {
    setIsTraining(true);
    try {
      // Simulate AI voice training process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // In real implementation, this would:
      // 1. Send tweet samples to OpenAI for analysis
      // 2. Generate voice profile and test replies
      // 3. Store training data in database
      
      const voiceTrainingSamples = [
        "Writing style: Professional yet approachable",
        "Preferred length: 120-160 characters",
        "Common patterns: Asks thoughtful questions, shares insights",
        "Tone: Knowledgeable but not condescending",
        "Engagement style: Value-first, relationship-building"
      ];

      const { error } = await supabase
        .from('users_profiles')
        .upsert({
          id: userId,
          voice_training_samples: voiceTrainingSamples,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      setTrainingComplete(true);
      onComplete(); // Call onComplete immediately after training completes
    } catch (error) {
      console.error('Error training voice model:', error);
    } finally {
      setIsTraining(false);
    }
  };

  if (trainingComplete) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-medium text-green-800 dark:text-green-200">
              AI voice training completed!
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              Your AI writing assistant is ready to generate replies in your style.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              Your Voice Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profile?.voice_training_samples?.map((sample: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full" />
                  <span className="text-sm">{sample}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-purple-900 dark:text-purple-100">
            AI Voice Training
          </h3>
        </div>
        <p className="text-sm text-purple-800 dark:text-purple-200">
          We'll analyze your recent tweets to understand your writing style, tone, and engagement patterns. 
          This helps our AI generate replies that sound authentically like you.
        </p>
      </div>

      {!analysis ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Twitter className="h-5 w-5 text-blue-500" />
              Analyze Your Twitter Voice
            </CardTitle>
            <CardDescription>
              Let's examine your recent tweets to understand your communication style
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">What we'll analyze:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Your writing tone and formality level</li>
                <li>• Common words and phrases you use</li>
                <li>• How you structure tweets and engage with others</li>
                <li>• Your expertise areas and interests</li>
                <li>• Length preferences and conversation style</li>
              </ul>
            </div>

            <div className="flex justify-center">
              <Button 
                onClick={analyzeTwitterHistory} 
                disabled={isAnalyzing}
                className="min-w-40"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Twitter className="h-4 w-4 mr-2" />
                    Analyze My Tweets
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-500" />
                Your Twitter Voice Analysis
              </CardTitle>
              <CardDescription>
                Based on your last {analysis.tweetCount} tweets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-2">Writing Style</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.style.map((style) => (
                        <Badge key={style} variant="secondary">{style}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Tone</h4>
                    <Badge variant="outline" className="capitalize">{analysis.tone}</Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-2">Common Topics</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.commonWords.map((word) => (
                        <Badge key={word} variant="secondary">{word}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Average Length</h4>
                    <Badge variant="outline">{analysis.avgLength} characters</Badge>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Sample Tweets</h4>
                <div className="space-y-2">
                  {analysis.sampleTweets.map((tweet, index) => (
                    <div key={index} className="p-3 bg-muted rounded-lg text-sm italic">
                      "{tweet}"
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Train Your AI Voice
              </CardTitle>
              <CardDescription>
                Create a personalized AI model that writes replies in your style
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Training will create:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• A personalized writing model based on your style</li>
                  <li>• Reply templates that match your tone and expertise</li>
                  <li>• Contextual understanding of your engagement preferences</li>
                  <li>• Quality filters to ensure professional consistency</li>
                </ul>
              </div>

              <div className="flex justify-center">
                <Button 
                  onClick={runVoiceTraining} 
                  disabled={isTraining}
                  className="min-w-40"
                >
                  {isTraining ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Training AI...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Train My Voice
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
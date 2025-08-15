"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Brain, Loader2, RefreshCw, MessageCircle } from "lucide-react";

interface VoiceTrainingStepProps {
  userId: string;
  profile: any;
  onComplete: () => void;
  twitterAnalysis?: {
    voiceAnalysis: {
      tweetCount: number;
      avgLength: number;
      commonWords: string[];
      tone: string;
      style: string[];
      sampleTweets: string[];
      interests: string[];
      engagementRate: number;
    };
  } | null;
}

interface TwitterAnalysis {
  tweetCount: number;
  avgLength: number;
  commonWords: string[];
  tone: 'professional' | 'casual' | 'technical' | 'friendly';
  style: string[];
  sampleTweets: string[];
}

export function VoiceTrainingStep({ userId, profile, onComplete, twitterAnalysis }: VoiceTrainingStepProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<TwitterAnalysis | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingComplete, setTrainingComplete] = useState(false);

  useEffect(() => {
    // Check if voice training is already complete
    if (profile?.voice_training_samples && profile.voice_training_samples.length > 0) {
      setTrainingComplete(true);
    }
  }, [profile]);

  // Use Twitter analysis from parent component if available
  useEffect(() => {
    if (twitterAnalysis?.voiceAnalysis) {
      const { voiceAnalysis } = twitterAnalysis;
      const componentAnalysis: TwitterAnalysis = {
        tweetCount: voiceAnalysis.tweetCount,
        avgLength: voiceAnalysis.avgLength,
        commonWords: voiceAnalysis.commonWords.slice(0, 5),
        tone: voiceAnalysis.tone as 'professional' | 'casual' | 'technical' | 'friendly',
        style: voiceAnalysis.style,
        sampleTweets: voiceAnalysis.sampleTweets
      };
      setAnalysis(componentAnalysis);
      console.log('Voice analysis loaded from parent component');
    }
  }, [twitterAnalysis]);

  const analyzeTwitterHistory = async () => {
    if (twitterAnalysis?.voiceAnalysis) {
      // Already have analysis from parent, no need to fetch again
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/twitter/analyze-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const responseData = await response.json();

      if (response.ok && responseData.analysis) {
        // Real Twitter analysis succeeded
        const { analysis } = responseData;
        
        // Convert API response to component format
        const componentAnalysis: TwitterAnalysis = {
          tweetCount: analysis.recentTweets.length,
          avgLength: analysis.writingStyle.avgLength,
          commonWords: analysis.writingStyle.commonWords.slice(0, 5),
          tone: analysis.writingStyle.tone,
          style: analysis.writingStyle.style,
          sampleTweets: analysis.recentTweets.slice(0, 3).map((tweet: any) => tweet.text)
        };
        
        setAnalysis(componentAnalysis);
      } else if (responseData.canFallback) {
        // Twitter credentials not available, use mock analysis
        const mockAnalysis: TwitterAnalysis = {
          tweetCount: 25,
          avgLength: 140,
          commonWords: ["professional", "development", "technology", "innovation", "business"],
          tone: "professional",
          style: ["informative", "value-adding"],
          sampleTweets: [
            "Looking forward to exploring new opportunities in tech innovation this year.",
            "What are your thoughts on the latest developments in professional development?",
            "Excited to share insights from recent business strategy discussions."
          ]
        };
        
        setAnalysis(mockAnalysis);
        alert('Twitter account not fully connected. Using sample analysis for demonstration.');
      } else {
        throw new Error(responseData.error || 'Failed to analyze Twitter history');
      }
    } catch (error: any) {
      console.error('Error analyzing Twitter history:', error);
      alert(`Failed to analyze your Twitter history: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runVoiceTraining = async () => {
    if (!analysis) {
      alert('Please analyze your Twitter history first');
      return;
    }

    setIsTraining(true);
    try {
      const response = await fetch('/api/twitter/voice-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          analysis: {
            user: { id: userId }, // Add minimal user info
            recentTweets: analysis.sampleTweets.map((text, index) => ({
              id: `sample_${index}`,
              text,
              public_metrics: { like_count: 0, retweet_count: 0, reply_count: 0 }
            })),
            writingStyle: {
              avgLength: analysis.avgLength,
              commonWords: analysis.commonWords,
              tone: analysis.tone,
              style: analysis.style
            },
            engagementPatterns: {
              avgLikes: 10,
              avgRetweets: 2,
              avgReplies: 3,
              bestPerformingTweets: []
            },
            topicInterests: analysis.commonWords
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to train voice model');
      }

      const { voiceTraining } = await response.json();
      console.log('Voice training completed:', voiceTraining);
      
      setTrainingComplete(true);
      onComplete(); // Call onComplete immediately after training completes
    } catch (error: any) {
      console.error('Error training voice model:', error);
      alert(`Failed to train voice model: ${error.message}`);
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
              <MessageCircle className="h-5 w-5 text-blue-500" />
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
                    <MessageCircle className="h-4 w-4 mr-2" />
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
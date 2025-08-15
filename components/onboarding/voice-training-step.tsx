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
      postsAnalyzed: number;
      voiceProfile: {
        sampleTweets: string[];
        voicePersonality: string;
        communicationStyle: string;
        interests: string[];
      };
      hasRealData: boolean;
      message: string;
    };
  } | null;
}

interface TwitterAnalysis {
  sampleTweets: string[];
  voicePersonality: string;
  communicationStyle: string;
  interests: string[];
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
      setAnalysis(voiceAnalysis.voiceProfile);
      console.log(`Voice analysis loaded from parent component: ${voiceAnalysis.message}`);
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
          sampleTweets: analysis.recentTweets.slice(0, 3).map((tweet: any) => tweet.text),
          voicePersonality: analysis.writingStyle.voicePersonality || 'Professional and informative with a helpful tone',
          communicationStyle: analysis.writingStyle.communicationStyle || 'Clear and direct communication with focus on value-driven content',
          interests: analysis.writingStyle.interests || ['technology', 'business']
        };
        
        setAnalysis(componentAnalysis);
      } else if (responseData.canFallback) {
        // Twitter credentials not available, use mock analysis
        const mockAnalysis: TwitterAnalysis = {
          sampleTweets: [
            "Looking forward to exploring new opportunities in tech innovation this year.",
            "What are your thoughts on the latest developments in professional development?",
            "Excited to share insights from recent business strategy discussions."
          ],
          voicePersonality: "Professional and engaging with a focus on innovation and growth",
          communicationStyle: "Thoughtful and encouraging, often asks questions to spark meaningful discussions",
          interests: ["technology", "innovation", "professional development", "business strategy"]
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
              voicePersonality: analysis.voicePersonality,
              communicationStyle: analysis.communicationStyle,
              interests: analysis.interests
            },
            engagementPatterns: {
              avgLikes: 10,
              avgRetweets: 2,
              avgReplies: 3,
              bestPerformingTweets: []
            },
            topicInterests: analysis.interests
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
                {twitterAnalysis?.voiceAnalysis ? 
                  `${twitterAnalysis.voiceAnalysis.message}` : 
                  'Based on your recent tweets'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-6">
                <div className="border border-border rounded-lg p-4 bg-card">
                  <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Voice Personality</h4>
                  <p className="text-base font-medium italic leading-relaxed">
                    "{analysis.voicePersonality}"
                  </p>
                </div>
                
                <div className="border border-border rounded-lg p-4 bg-card">
                  <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Communication Style</h4>
                  <p className="text-base font-medium italic leading-relaxed">
                    "{analysis.communicationStyle}"
                  </p>
                </div>

                <div className="border border-border rounded-lg p-4 bg-card">
                  <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Key Interests</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.interests.map((interest) => (
                      <Badge key={interest} variant="secondary" className="text-base font-medium">{interest}</Badge>
                    ))}
                  </div>
                </div>
              </div>


              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Sample Tweets</h4>
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

          <div className="space-y-6">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Brain className="h-6 w-6 text-purple-600" />
                <h3 className="text-xl font-semibold">We&apos;ll use this analysis to craft replies in your tone and style</h3>
              </div>
            </div>

            <div className="flex justify-center">
              <Button 
                onClick={runVoiceTraining} 
                disabled={isTraining}
                size="lg"
                className="min-w-48"
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
          </div>
        </div>
      )}
    </div>
  );
}
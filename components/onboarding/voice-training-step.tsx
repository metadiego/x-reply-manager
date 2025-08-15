"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Brain, Loader2, MessageCircle } from "lucide-react";

interface VoiceTrainingStepProps {
  userId: string;
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

export function VoiceTrainingStep({ userId, onComplete, twitterAnalysis }: VoiceTrainingStepProps) {
  const [analysis, setAnalysis] = useState<TwitterAnalysis | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [trainingComplete, setTrainingComplete] = useState(false);
  const [voiceProfile, setVoiceProfile] = useState<any>(null);

  useEffect(() => {
    // Check if voice profile already exists
    const checkVoiceProfile = async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      const { data } = await supabase
        .from('voice_profiles')
        .select('analysis')
        .eq('user_id', userId)
        .single();
      
      if (data) {
        setVoiceProfile(data.analysis);
        setTrainingComplete(true);
      }
    };
    
    checkVoiceProfile();
  }, [userId]);

  // Use Twitter analysis from parent component
  useEffect(() => {
    if (twitterAnalysis?.voiceAnalysis) {
      const { voiceAnalysis } = twitterAnalysis;
      setAnalysis(voiceAnalysis.voiceProfile);
      console.log(`Voice analysis loaded from parent component: ${voiceAnalysis.message}`);
    }
  }, [twitterAnalysis]);

  const saveVoiceProfile = async () => {
    if (!analysis) {
      alert('No analysis data available');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/voice-profile/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          analysis: {
            voicePersonality: analysis.voicePersonality,
            communicationStyle: analysis.communicationStyle,
            interests: analysis.interests,
            sampleTweets: analysis.sampleTweets
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save voice profile');
      }

      console.log('Voice profile saved successfully');
      setVoiceProfile(analysis);
      setTrainingComplete(true);
      onComplete(); // Call onComplete immediately after saving
    } catch (error: any) {
      console.error('Error saving voice profile:', error);
      alert(`Failed to save voice profile: ${error.message}`);
    } finally {
      setIsSaving(false);
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
              {voiceProfile && (
                <>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Voice Personality:</p>
                    <p className="text-sm text-muted-foreground italic">"{voiceProfile.voicePersonality || 'Analyzing...'}"</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Communication Style:</p>
                    <p className="text-sm text-muted-foreground italic">"{voiceProfile.communicationStyle || 'Analyzing...'}"</p>
                  </div>
                </>
              )}
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
          We&apos;ll analyze your recent tweets to understand your writing style, tone, and engagement patterns. 
          This helps our AI generate replies that sound authentically like you.
        </p>
      </div>

      {analysis ? (
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
                onClick={saveVoiceProfile} 
                disabled={isSaving}
                size="lg"
                className="min-w-48"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving Profile...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Save Voice Profile
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center p-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Waiting for Twitter analysis...</p>
        </div>
      )}
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Target, Mail, Clock, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { TargetSetupStep } from "@/components/onboarding/target-setup-step";
import { DigestPreferencesStep } from "@/components/onboarding/digest-preferences-step";
import { VoiceTrainingStep } from "@/components/onboarding/voice-training-step";

interface TwitterAnalysisData {
  tweets: any[];
  topicAnalysis: {
    postsAnalyzed: number;
    topicSuggestions: any[];
    hasRealData: boolean;
    message: string;
  };
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
}

interface OnboardingFlowProps {
  user: { sub: string; email?: string };
  profile: { daily_digest_time?: string; digest_configured?: boolean; voice_training_samples?: string[] } | null;
  targetsCount: number;
}

export function OnboardingFlow({ 
  user, 
  profile, 
  targetsCount 
}: OnboardingFlowProps) {
  const router = useRouter();
  
  // State for Twitter analysis data
  const [twitterAnalysis, setTwitterAnalysis] = useState<TwitterAnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  // Determine starting step based on completion status
  // Skip Twitter connection since user is already authenticated via Twitter OAuth
  const getInitialStep = () => {
    if (targetsCount === 0) return 0; // Start with monitoring targets
    if (!profile?.digest_configured) return 1; // Then digest preferences
    if (!profile?.voice_training_samples || profile.voice_training_samples.length === 0) return 2; // Then voice training
    return 3; // Completion step
  };

  const [currentStep, setCurrentStep] = useState(getInitialStep());
  const totalSteps = 3; // Reduced from 4 since we skip Twitter connection
  
  // Fetch Twitter analysis data once when component mounts
  useEffect(() => {
    const fetchTwitterAnalysis = async () => {
      setIsAnalyzing(true);
      setAnalysisError(null);
      
      try {
        const response = await fetch('/api/twitter/analyze-onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (response.ok) {
          const data = await response.json();
          setTwitterAnalysis(data);
          console.log('Twitter analysis loaded:', data.topicAnalysis.message);
        } else {
          console.error('Failed to fetch Twitter analysis');
          setAnalysisError('Failed to analyze Twitter account');
        }
      } catch (error) {
        console.error('Error fetching Twitter analysis:', error);
        setAnalysisError('Error connecting to analysis service');
      } finally {
        setIsAnalyzing(false);
      }
    };
    
    // Only fetch if we haven't already
    if (!twitterAnalysis && !isAnalyzing) {
      fetchTwitterAnalysis();
    }
  }, []);

  const steps = [
    {
      id: 0,
      title: "Set Up Monitoring Targets",
      description: "Tell us what topics or Twitter lists you'd like to monitor for engagement opportunities.",
      icon: Target,
      completed: targetsCount > 0
    },
    {
      id: 1,
      title: "Configure Your Digest",
      description: "Set your preferences for when and how you receive your daily digest.",
      icon: Mail,
      completed: !!profile?.digest_configured
    },
    {
      id: 2,
      title: "AI Voice Training",
      description: "We'll analyze your recent tweets to learn your writing style and tone.",
      icon: Clock,
      completed: profile?.voice_training_samples && profile.voice_training_samples.length > 0
    }
  ];

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Onboarding complete, redirect to dashboard
      router.push("/");
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipToCompleted = () => {
    router.push("/");
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Welcome to X Reply Manager</h1>
            <p className="text-muted-foreground mt-2">
              Let's get you set up to receive your first daily digest
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {totalSteps}
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Content */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${currentStepData.completed ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
              {currentStepData.completed ? (
                <CheckCircle className="h-6 w-6" />
              ) : (
                <currentStepData.icon className="h-6 w-6" />
              )}
            </div>
            <div>
              <CardTitle className="text-2xl">{currentStepData.title}</CardTitle>
              <CardDescription className="text-base mt-1">
                {currentStepData.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Show loading state while fetching Twitter analysis */}
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Analyzing your Twitter profile...</p>
            </div>
          )}
          
          {/* Show error state if analysis failed */}
          {analysisError && !isAnalyzing && (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{analysisError}</p>
              <p className="text-sm text-muted-foreground">
                You can continue with default suggestions or try refreshing the page.
              </p>
            </div>
          )}
          
          {/* Show step content when ready */}
          {!isAnalyzing && (
            <>
              {/* Step 0: Monitoring Targets Setup */}
              {currentStep === 0 && (
                <TargetSetupStep 
                  userId={user.sub}
                  onComplete={handleNext}
                  targetsCount={targetsCount}
                  twitterAnalysis={twitterAnalysis}
                />
              )}

              {/* Step 1: Digest Preferences */}
              {currentStep === 1 && (
                <DigestPreferencesStep 
                  userId={user.sub}
                  profile={profile}
                  onComplete={handleNext}
                />
              )}

              {/* Step 2: Voice Training */}
              {currentStep === 2 && (
                <VoiceTrainingStep 
                  userId={user.sub}
                  onComplete={handleNext}
                  twitterAnalysis={twitterAnalysis}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            onClick={handleSkipToCompleted}
          >
            Skip for now
          </Button>
          
          {currentStepData.completed && (
            <Button onClick={handleNext}>
              {currentStep === totalSteps - 1 ? "Complete Setup" : "Continue"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
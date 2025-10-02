"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProcessingUserPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const processUser = async () => {
      try {
        console.log('Starting user processing after onboarding...');

        const response = await fetch('/api/process-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          console.error('Processing failed:', data.error || response.statusText);
          setStatus('error');
          setErrorMessage(data.error || 'Failed to process tweets');
          return;
        }

        console.log('Processing completed successfully:', data);
        setStatus('success');

        // Wait a moment to show success message, then redirect
        setTimeout(() => {
          router.push('/');
        }, 1500);

      } catch (error: any) {
        console.error('Error processing user:', error);
        setStatus('error');
        setErrorMessage(error.message || 'An unexpected error occurred');
      }
    };

    processUser();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center max-w-md">
        {status === 'processing' && (
          <>
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-3">Preparing Your Daily Replies</h2>
            <p className="text-muted-foreground mb-2">
              We're analyzing tweets based on your monitoring targets and generating personalized reply suggestions...
            </p>
            <p className="text-sm text-muted-foreground">
              This usually takes 10-30 seconds
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-3">All Set!</h2>
            <p className="text-muted-foreground mb-2">
              Your daily replies are ready. Redirecting to your dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-3">Something Went Wrong</h2>
            <p className="text-muted-foreground mb-4">
              {errorMessage || 'We encountered an error while preparing your replies.'}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Don't worry, you can still use the app. We'll try to process your tweets automatically.
            </p>
            <Button onClick={() => router.push('/')}>
              Continue to Dashboard
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
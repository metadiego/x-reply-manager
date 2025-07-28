import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Suspense } from "react";

function ErrorDetails() {
  // This will run on the client side to access URL params
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const description = urlParams.get('description') || urlParams.get('error_description');
    
    if (error || description) {
      return (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
          <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Error Details:</h4>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              <strong>Error:</strong> {error}
            </p>
          )}
          {description && (
            <p className="text-sm text-red-600 dark:text-red-400">
              <strong>Description:</strong> {decodeURIComponent(description)}
            </p>
          )}
        </div>
      );
    }
  }
  
  return null;
}

export default function AuthCodeError() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Authentication Error</CardTitle>
            <CardDescription>
              Sorry, there was a problem with your Twitter authentication.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                This could happen if:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>You cancelled the Twitter authentication process</li>
                <li>There was a network issue during authentication</li>
                <li>Your session expired during the process</li>
                <li>Twitter couldn't provide required information (like email)</li>
                <li>There's a configuration issue with the OAuth setup</li>
              </ul>

              <Suspense fallback={null}>
                <ErrorDetails />
              </Suspense>
              
              <div className="flex flex-col gap-2 pt-4">
                <Button asChild>
                  <Link href="/auth/login">
                    Try Again
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/">
                    Go Home
                  </Link>
                </Button>
              </div>

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Troubleshooting:</strong> Check the browser console for detailed error logs, 
                  or contact support if the issue persists.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
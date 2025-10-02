"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface TwitterLoginButtonProps {
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

export function TwitterLoginButton({
  className,
  variant = "default",
  size = "default"
}: TwitterLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTwitterLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("twitter", {
        callbackUrl: "/home",
        redirect: true,
      });

      if (result?.error) {
        throw new Error(result.error);
      }
    } catch (error: unknown) {
      console.error('Twitter OAuth error:', error);
      setError(error instanceof Error ? error.message : "Failed to authenticate with Twitter");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleTwitterLogin}
        disabled={isLoading}
        variant={variant}
        size={size}
        className={className}
      >
        {isLoading ? (
          <>
            <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Connecting...
          </>
        ) : (
          <>
            <svg
              className="mr-2 h-4 w-4"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
            </svg>
            Continue with Twitter
          </>
        )}
      </Button>
      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}
    </div>
  );
}
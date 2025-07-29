"use client";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TwitterLoginButton } from "./twitter-login-button";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to X Reply Manager</CardTitle>
          <CardDescription>
            Connect with your Twitter account to get started with AI-curated daily digests and personalized reply suggestions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="text-center">
              <TwitterLoginButton className="w-full" size="lg" />
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">What you'll get:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Daily digest of 10-30 posts worth replying to</li>
                <li>• AI-generated replies in your writing style</li>
                <li>• Smart monitoring of topics and Twitter lists</li>
                <li>• One-click reply approval and scheduling</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

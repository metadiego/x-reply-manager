import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AuthCodeError() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Authentication Error</CardTitle>
            <CardDescription>
              Sorry, there was a problem with your authentication.
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
              </ul>
              
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { ConnectTwitterButton } from './connect-button';

interface TwitterConnectionStatusProps {
  isConnected: boolean;
  twitterHandle?: string;
  connectedAt?: string;
}

export function TwitterConnectionStatus({
  isConnected,
  twitterHandle,
  connectedAt,
}: TwitterConnectionStatusProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Twitter? Some features may not work without this connection.')) {
      return;
    }

    setIsDisconnecting(true);
    setError(null);

    try {
      const response = await fetch('/api/twitter-oauth/disconnect', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect Twitter');
      }

      // Refresh the page to update connection status
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
      setIsDisconnecting(false);
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <XCircle className="h-6 w-6 text-red-500" />
            <div>
              <CardTitle>Twitter Not Connected</CardTitle>
              <CardDescription>
                Connect your Twitter account to enable full functionality
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To fetch post metrics and post replies automatically, we need permission to access Twitter on your behalf.
            </p>
            <ConnectTwitterButton />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <CardTitle>Twitter Connected</CardTitle>
              <CardDescription>
                {twitterHandle && `@${twitterHandle} • `}
                Connected {connectedAt && `on ${new Date(connectedAt).toLocaleDateString()}`}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your Twitter account is connected and working properly. We can fetch metrics and post replies on your behalf.
          </p>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <Button
            variant="outline"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
          >
            {isDisconnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              'Disconnect Twitter'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Clock, Mail, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface DigestPreferencesStepProps {
  userId: string;
  profile: any;
  onComplete: () => void;
}

export function DigestPreferencesStep({ userId, profile, onComplete }: DigestPreferencesStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [digestTime, setDigestTime] = useState(profile?.daily_digest_time || "09:00");
  const [timezone, setTimezone] = useState(profile?.timezone || "America/New_York");

  const supabase = createClient();

  const timezones = [
    { value: "America/New_York", label: "Eastern Time (EST/EDT)" },
    { value: "America/Chicago", label: "Central Time (CST/CDT)" },
    { value: "America/Denver", label: "Mountain Time (MST/MDT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PST/PDT)" },
    { value: "UTC", label: "UTC" },
    { value: "Europe/London", label: "London (GMT/BST)" },
    { value: "Europe/Paris", label: "Paris (CET/CEST)" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)" },
    { value: "Asia/Singapore", label: "Singapore (SGT)" },
    { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" }
  ];

  const handleSavePreferences = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('users_profiles')
        .upsert({
          id: userId,
          daily_digest_time: digestTime,
          timezone: timezone,
          digest_configured: true,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      onComplete();
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (profile?.digest_configured) {
    return (
      <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <div>
          <p className="font-medium text-green-800 dark:text-green-200">
            Digest preferences configured!
          </p>
          <p className="text-sm text-green-600 dark:text-green-400">
            You'll receive your daily digest at {profile.daily_digest_time} ({profile.timezone}).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
            Daily Digest Delivery
          </h3>
        </div>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Choose when you'd like to receive your curated digest of posts with AI-generated reply suggestions. 
          Most users prefer mornings (8-10 AM) to review and schedule replies for the day.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Digest Schedule
          </CardTitle>
          <CardDescription>
            Set your preferred time and timezone for receiving daily digests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="digest-time">Delivery Time</Label>
              <Input
                id="digest-time"
                type="time"
                value={digestTime}
                onChange={(e) => setDigestTime(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Choose a time when you can review and approve replies
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">What you'll receive:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 10-30 carefully curated posts worth replying to</li>
              <li>• AI-generated reply suggestions in your voice</li>
              <li>• Context on why each post was selected</li>
              <li>• One-click approve, edit, or skip options</li>
              <li>• Direct links to reply on Twitter</li>
            </ul>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
            <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
              Preview Your Schedule
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Based on your settings, you'll receive your daily digest at{' '}
              <strong>{digestTime}</strong> in <strong>{timezones.find(tz => tz.value === timezone)?.label}</strong>.
            </p>
          </div>

          <div className="flex justify-center pt-4">
            <Button 
              onClick={handleSavePreferences} 
              disabled={isLoading}
              className="min-w-32"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Preferences"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
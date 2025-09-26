'use client';

import { SidebarNav } from "@/components/sidebar-nav";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ClientSidebarWrapper() {
  const [userHandle, setUserHandle] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('users_profiles')
          .select('twitter_handle')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserHandle(profile.twitter_handle);
        }
      }
    };

    fetchUserProfile();
  }, []);

  return <SidebarNav userHandle={userHandle} />;
}
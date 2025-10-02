'use client';

import { SidebarNav } from "@/components/sidebar-nav";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "next-auth/react";

export function ClientSidebarWrapper() {
  const { data: session } = useSession();
  const [userHandle, setUserHandle] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user) return;

      const supabase = createClient();
      const userId = session.user.id;

      const { data: profile } = await supabase
        .from('users_profiles')
        .select('twitter_handle')
        .eq('id', userId)
        .single();

      if (profile) {
        setUserHandle(profile.twitter_handle);
      }
    };

    fetchUserProfile();
  }, [session]);

  return <SidebarNav userHandle={userHandle} />;
}
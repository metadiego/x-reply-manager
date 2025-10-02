import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login");
  }

  const supabase = await createClient();
  const userId = session.user.id;

  const { data: profile } = await supabase
    .from('users_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return (
    <>
      <main className="flex-shrink-0 w-[600px]">
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
            <p className="text-muted-foreground">
              Manage your profile information.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Twitter Handle</h3>
              <p className="text-sm text-muted-foreground">
                @{profile?.twitter_handle || 'Not connected'}
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Subscription Tier</h3>
              <p className="text-sm text-muted-foreground capitalize">
                {profile?.subscription_tier || 'Free'}
              </p>
            </div>
          </div>
        </div>
      </main>
      <aside className="hidden lg:block flex-1 min-w-[350px]" />
    </>
  );
}
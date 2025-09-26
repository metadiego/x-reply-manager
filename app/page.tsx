import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/login-form";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  // If user is authenticated, redirect to home
  if (!error && data?.claims) {
    redirect("/home");
  }

  // Show login form for unauthenticated users
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
import { LoginForm } from "@/components/login-form";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export default async function RootPage() {
  const session = await getServerSession(authOptions);

  // If user is authenticated, redirect to home
  if (session?.user) {
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
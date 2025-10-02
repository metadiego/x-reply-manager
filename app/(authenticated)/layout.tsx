import { redirect } from "next/navigation";
import { ClientSidebarWrapper } from "@/components/client-sidebar-wrapper";
import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // If user is not authenticated, redirect to home
  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-background justify-center">
      <div className="flex w-full max-w-[1280px]">
        {/* Persistent Sidebar */}
        <div className="flex-shrink-0 w-[88px] xl:w-[275px] border-r shadow-sm">
          <div className="sticky top-0 h-screen">
            <ClientSidebarWrapper />
          </div>
        </div>

        {/* Page Content with Animation */}
        <div className="flex-1 relative">
          <Suspense fallback={
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
              <div className="animate-pulse space-y-4 w-full max-w-[600px] p-6">
                <div className="h-8 bg-muted rounded w-1/3"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
                <div className="space-y-3 mt-8">
                  <div className="h-32 bg-muted rounded"></div>
                  <div className="h-32 bg-muted rounded"></div>
                  <div className="h-32 bg-muted rounded"></div>
                </div>
              </div>
            </div>
          }>
            <div className="animate-in fade-in-0 duration-200">
              {children}
            </div>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
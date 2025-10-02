import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

export default async function AnalyticsPage() {
  return (
    <>
      {/* Main Content */}
      <main className="flex-shrink-0 w-[600px]">
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">
              Track your engagement performance and time savings.
            </p>
          </div>

          {/* Analytics Dashboard Component */}
          <AnalyticsDashboard />
        </div>
      </main>

      {/* Right Sidebar */}
      <aside className="hidden lg:block flex-1 min-w-[350px]" />
    </>
  );
}
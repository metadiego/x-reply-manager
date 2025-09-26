export default function HomeLoading() {
  return (
    <>
      <main className="flex-shrink-0 w-[600px]">
        <div className="bg-background">
          <div className="p-6">
            <div className="animate-pulse space-y-2">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          </div>
        </div>
        <div className="min-h-screen p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="border rounded-lg p-6 space-y-4">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-20 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <aside className="hidden lg:block flex-1 min-w-[350px]" />
    </>
  );
}
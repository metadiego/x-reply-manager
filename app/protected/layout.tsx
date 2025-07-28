import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
import { Mail, Twitter, Home, Settings, Target, BarChart3 } from "lucide-react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link className="mr-6 flex items-center space-x-2" href="/protected">
              <Twitter className="h-6 w-6" />
              <span className="font-bold sm:inline-block">
                X Reply Manager
              </span>
            </Link>
          </div>
          
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link
                href="/protected"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                <Home className="h-4 w-4" />
              </Link>
              <Link
                href="/protected/targets"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                <Target className="h-4 w-4" />
              </Link>
              <Link
                href="/protected/digest"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                <Mail className="h-4 w-4" />
              </Link>
              <Link
                href="/protected/analytics"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                <BarChart3 className="h-4 w-4" />
              </Link>
              <Link
                href="/protected/settings"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </nav>
            
            <div className="flex items-center space-x-2">
              <ThemeSwitcher />
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-6">
        {children}
      </main>
    </div>
  );
}

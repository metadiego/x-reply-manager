import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
import { Twitter, Home, Settings, Target, BarChart3 } from "lucide-react";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        {/* Logo and Brand */}
        <Link className="flex items-center space-x-3" href="/">
          <Twitter className="h-7 w-7 text-blue-500" />
          <span className="text-xl font-bold tracking-tight">
            X Reply Manager
          </span>
        </Link>
        
        {/* Navigation and Actions */}
        <div className="flex items-center space-x-8">
          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/"
              className="flex items-center space-x-1 text-sm font-medium transition-colors hover:text-blue-600 text-muted-foreground hover:text-foreground"
              title="Home"
            >
              <Home className="h-4 w-4" />
              <span className="hidden lg:inline">Home</span>
            </Link>
            <Link
              href="/targets"
              className="flex items-center space-x-1 text-sm font-medium transition-colors hover:text-blue-600 text-muted-foreground hover:text-foreground"
              title="Targets"
            >
              <Target className="h-4 w-4" />
              <span className="hidden lg:inline">Targets</span>
            </Link>
            <Link
              href="/analytics"
              className="flex items-center space-x-1 text-sm font-medium transition-colors hover:text-blue-600 text-muted-foreground hover:text-foreground"
              title="Analytics"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden lg:inline">Analytics</span>
            </Link>
            <Link
              href="/settings"
              className="flex items-center space-x-1 text-sm font-medium transition-colors hover:text-blue-600 text-muted-foreground hover:text-foreground"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden lg:inline">Settings</span>
            </Link>
          </nav>
          
          {/* Theme Switcher and Auth */}
          <div className="flex items-center space-x-3">
            <ThemeSwitcher />
            <AuthButton />
          </div>
        </div>
      </div>
    </header>
  );
}
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Home,
  Search,
  Bell,
  Mail,
  Bookmark,
  Users,
  User,
  MoreHorizontal,
  Settings,
  Target,
  MessageSquare,
  BarChart3,
  Twitter
} from 'lucide-react';

interface SidebarNavProps {
  userHandle?: string;
}

export function SidebarNav({ userHandle }: SidebarNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      title: 'Home',
      href: '/home',
      icon: Home,
    },
    {
      title: 'Monitoring',
      href: '/targets',
      icon: Target,
    },
    {
      title: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  return (
    <div className="flex h-full flex-col px-3 py-4">
      {/* Logo */}
      <div className="mb-8 px-3">
        <Link href="/" className="flex items-center gap-2">
          <Twitter className="h-8 w-8 text-blue-500" />
          <span className="text-xl font-bold hidden xl:block">Reply Manager</span>
        </Link>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href ||
                          (item.href !== '/home' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                "flex items-center gap-4 rounded-full px-3 py-3 text-xl transition-colors duration-100 hover:bg-muted",
                isActive && "font-bold bg-muted/50"
              )}
            >
              <Icon className="h-7 w-7" />
              <span className="hidden xl:block">{item.title}</span>
            </Link>
          );
        })}
      </nav>


      {/* User Profile */}
      {userHandle && (
        <div className="mt-4 flex items-center gap-3 rounded-full p-3 hover:bg-muted transition-colors cursor-pointer">
          <div className="h-10 w-10 rounded-full bg-muted" />
          <div className="hidden xl:block flex-1">
            <p className="text-sm font-semibold">{userHandle}</p>
            <p className="text-xs text-muted-foreground">@{userHandle}</p>
          </div>
          <MoreHorizontal className="hidden xl:block h-5 w-5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Database, BarChart2, Key, Settings, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/indexes', label: 'Indexes', icon: Database },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/dashboard/api-keys', label: 'API Keys', icon: Key },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

interface SidebarNavProps {
  onNavClick?: () => void;
}

export function SidebarNav({ onNavClick }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 mt-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavClick}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarBrand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-3 py-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
        <Search className="h-4 w-4 text-white" />
      </div>
      <span className="text-lg font-bold text-white">SearchKit</span>
    </Link>
  );
}

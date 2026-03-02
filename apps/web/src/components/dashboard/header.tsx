'use client';

import { signOut } from 'next-auth/react';
import { LogOut, ChevronRight } from 'lucide-react';
import { MobileNav } from './mobile-nav';

interface DashboardHeaderProps {
  breadcrumb: string;
  userEmail?: string | null;
}

export function DashboardHeader({ breadcrumb, userEmail }: DashboardHeaderProps) {
  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-slate-700 bg-slate-800/50 flex-shrink-0">
      <div className="flex items-center gap-3">
        <MobileNav />
        <div className="flex items-center gap-1.5 text-sm text-slate-400">
          <span>SearchKit</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-100">{breadcrumb}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {userEmail && (
          <span className="hidden sm:block text-xs text-slate-400 truncate max-w-40">{userEmail}</span>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded-md transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}

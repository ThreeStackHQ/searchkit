import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { WorkspaceProvider } from '@/lib/workspace-context';
import { SidebarBrand, SidebarNav } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  return (
    <WorkspaceProvider>
      <div className="flex h-screen bg-slate-900 overflow-hidden">
        {/* Sidebar - desktop */}
        <aside className="hidden lg:flex w-60 flex-col bg-[#0f172a] border-r border-slate-700/50 flex-shrink-0">
          <div className="px-3 pt-2">
            <SidebarBrand />
          </div>
          <div className="px-3 flex-1 overflow-y-auto py-2">
            <SidebarNav />
          </div>
          <div className="p-4 border-t border-slate-700/50">
            <p className="text-xs text-slate-500 truncate">{session.user?.email}</p>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex flex-col flex-1 min-w-0">
          <DashboardHeader
            breadcrumb="Dashboard"
            userEmail={session.user?.email}
          />
          <main className="flex-1 overflow-y-auto bg-[#1e293b] p-6">
            {children}
          </main>
        </div>
      </div>
    </WorkspaceProvider>
  );
}

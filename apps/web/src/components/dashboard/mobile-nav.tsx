'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SidebarBrand, SidebarNav } from './sidebar';

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="lg:hidden p-2 text-slate-400 hover:text-slate-100 rounded-md hover:bg-slate-700 transition-colors">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-0 flex flex-col bg-slate-900 border-slate-700">
        <div className="px-3 pt-2">
          <SidebarBrand />
        </div>
        <div className="px-3 flex-1 overflow-y-auto">
          <SidebarNav onNavClick={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

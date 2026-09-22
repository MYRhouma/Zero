import type { ReactNode } from 'react';
import React from 'react';
import { YachtbaseSidebar } from './yachtbase-sidebar';
import { YachtbaseTopbar } from './yachtbase-topbar';

void React;

export function YachtbaseShell({ children }: { children: ReactNode }) {
  return (
    <div className="yachtbase-email-shell min-h-screen w-full bg-[#f6fbfa] text-[#0b2431]">
      <YachtbaseSidebar />
      <div className="flex min-h-screen min-w-0 flex-col lg:pl-[260px]">
        <YachtbaseTopbar />
        <main
          aria-label="Email workspace"
          className="yachtbase-email-main min-h-0 min-w-0 flex-1 overflow-hidden"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

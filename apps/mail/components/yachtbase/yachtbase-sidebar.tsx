import { YACHTBASE_NAVIGATION } from './yachtbase-navigation';
import React from 'react';

void React;

export function YachtbaseSidebar() {
  return (
    <aside
      aria-label="Yachtbase navigation"
      className="yachtbase-global-sidebar fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-[#234957] bg-[#0b2431] text-[#f4f5f2] lg:flex"
    >
      <div className="flex min-h-20 items-center border-b border-white/10 px-5">
        <a
          href="/dashboard"
          className="text-[1.35rem] font-extrabold tracking-[-0.09em] text-white"
        >
          yachtbase<span className="text-[#a7d8d1]">.</span>
        </a>
      </div>
      <nav aria-label="Global navigation" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/55">
          Workspace
        </p>
        <div className="space-y-1">
          {YACHTBASE_NAVIGATION.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/dashboard/email';
            return (
              <a
                key={href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-[#397b7b]/25 font-medium text-[#a7d8d1]'
                    : 'text-white/65 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span>{label}</span>
              </a>
            );
          })}
        </div>
      </nav>
      <div className="border-t border-white/10 px-5 py-4 text-[11px] text-white/45">
        Yachtbase workspace
      </div>
    </aside>
  );
}

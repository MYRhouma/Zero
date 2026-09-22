import { ChevronRight, LogOut, UserRound } from 'lucide-react';
import React from 'react';
import { signOut } from '../../lib/auth-client';

void React;

export function YachtbaseTopbar() {
  const handleSignOut = async () => {
    await signOut();
    window.location.assign('/login');
  };

  return (
    <header className="yachtbase-global-topbar hidden h-16 shrink-0 items-center justify-between border-b border-[#d5e3e0] bg-[#f6fbfa]/95 px-6 text-[#0b2431] backdrop-blur lg:flex">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <a href="/dashboard" className="text-[#397b7b] transition-colors hover:text-[#0b2431]">
          Overview
        </a>
        <ChevronRight className="h-4 w-4 text-[#89a19e]" aria-hidden="true" />
        <span className="font-medium">Email</span>
      </nav>
      <div className="flex items-center gap-2">
        <a
          href="/dashboard/settings/profile"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#d5e3e0] bg-white px-3 text-xs font-medium text-[#0b2431] transition-colors hover:border-[#397b7b]"
        >
          <UserRound className="h-4 w-4 text-[#397b7b]" aria-hidden="true" />
          Profile
        </a>
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-transparent px-3 text-xs font-medium text-[#397b7b] transition-colors hover:bg-[#e5f1ee]"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </header>
  );
}

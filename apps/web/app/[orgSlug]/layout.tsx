'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@platform/auth';
import { ScopeSwitcher } from '@/components/ScopeSwitcher';
import { LayoutDashboard, FolderKanban, Settings, LogOut, Loader2, Shield, User, ShieldAlert } from 'lucide-react';

export default function ScopeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { orgSlug } = useParams() as { orgSlug: string };
  const { data: sessionData, isPending: loading } = authClient.useSession();
  const user = sessionData?.user;

  useEffect(() => {
    if (!loading && !sessionData) {
      router.push('/login');
    }
  }, [sessionData, loading]);

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  const navItems = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: `/${orgSlug}`,
      active: pathname === `/${orgSlug}`,
    },
    {
      label: 'Incidents',
      icon: ShieldAlert,
      href: `/${orgSlug}/incidents`,
      active: pathname === `/${orgSlug}/incidents` || (pathname.includes('/projects/') && pathname.includes('/incidents')),
    },
    {
      label: 'Projects',
      icon: FolderKanban,
      href: `/${orgSlug}/projects`,
      active: pathname === `/${orgSlug}/projects` || (pathname.startsWith(`/${orgSlug}/projects`) && !pathname.includes('/incidents')),
    },
    {
      label: 'Settings',
      icon: Settings,
      href: `/${orgSlug}/settings/general`,
      active: pathname.startsWith(`/${orgSlug}/settings`),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060913] text-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex">
      {/* Sidebar sidebar */}
      <aside className="w-64 border-r border-slate-900 bg-slate-950/40 backdrop-blur-xl flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-2.5 border-b border-slate-950">
          <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center border border-indigo-500/30">
            <Shield className="w-4.5 h-4.5 text-indigo-400" />
          </div>
          <span className="font-extrabold text-lg bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Triage AI
          </span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                  item.active
                    ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-300'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${item.active ? 'text-indigo-400' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Card Profile Footer */}
        <div className="p-4 border-t border-slate-950 flex items-center justify-between gap-3 bg-slate-950/20">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-indigo-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Copilot User'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email || ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-900 text-slate-400 hover:text-red-400 transition"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </aside>

      {/* Main app body wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header toolbar */}
        <header className="h-16 border-b border-slate-950 bg-slate-950/20 backdrop-blur-xl px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <ScopeSwitcher />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-slate-500 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-850">
              Region: AP-Southeast-1
            </span>
          </div>
        </header>

        {/* Content body wrapper */}
        <main className="flex-1 overflow-y-auto bg-[#060913]/30 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

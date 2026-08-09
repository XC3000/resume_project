'use client';

import React, { useState, useEffect } from 'react';
import { authClient } from '@platform/auth';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, Key, LogOut, Menu, X, User, ShieldCheck, Github } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login');
    }
  }, [session, isPending, router]);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/login');
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary animate-pulse font-medium text-lg">Validating session...</div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect in useEffect
  }

  const navItems = [
    { name: 'Live Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'API Key Sources', href: '/sources', icon: Key },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row relative">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-border shrink-0">
        <div className="p-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <span className="text-lg font-bold tracking-wider gradient-text">TELEMETRY</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition ${
                  active
                    ? 'bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20'
                    : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
          <a
            href="https://github.com/XC3000/resume_project"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-card/50 hover:text-foreground transition"
          >
            <Github className="h-5 w-5" />
            <span>GitHub Repository</span>
          </a>
        </nav>

        {/* User Info footer */}
        <div className="p-4 border-t border-border space-y-4">
          <div className="flex items-center space-x-3 px-2">
            <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold">
              {session.user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <div className="font-semibold text-sm truncate">{session.user.name}</div>
              <div className="text-xs text-muted-foreground truncate">{session.user.email}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition font-medium"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border glass-panel">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="text-md font-bold tracking-wider gradient-text">TELEMETRY</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-card border border-border text-foreground/80 hover:text-foreground"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative flex flex-col w-full max-w-xs bg-card border-r border-border p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <Link href="/dashboard" className="flex items-center space-x-2" onClick={() => setMobileMenuOpen(false)}>
                <ShieldCheck className="h-8 w-8 text-primary" />
                <span className="text-lg font-bold tracking-wider gradient-text font-serif">TELEMETRY</span>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg bg-card border border-border text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition ${
                      active
                        ? 'bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20'
                        : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-6 border-t border-border space-y-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                  {session.user.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="font-semibold text-sm">{session.user.name}</div>
                  <div className="text-xs text-muted-foreground">{session.user.email}</div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition font-medium"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Panel */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-full">
        {children}
      </main>
    </div>
  );
}

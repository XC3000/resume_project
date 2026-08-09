'use client';

import React from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Settings, Users, Key, Cable, BarChart } from 'lucide-react';

export function SettingsTabs() {
  const pathname = usePathname();
  const { orgSlug } = useParams() as { orgSlug: string };

  const tabs = [
    {
      label: 'General',
      icon: Settings,
      href: `/${orgSlug}/settings/general`,
      active: pathname === `/${orgSlug}/settings/general`,
    },
    {
      label: 'Members',
      icon: Users,
      href: `/${orgSlug}/settings/members`,
      active: pathname === `/${orgSlug}/settings/members`,
    },
    {
      label: 'API Keys',
      icon: Key,
      href: `/${orgSlug}/settings/keys`,
      active: pathname === `/${orgSlug}/settings/keys`,
    },
    {
      label: 'Integrations',
      icon: Cable,
      href: `/${orgSlug}/settings/integrations`,
      active: pathname === `/${orgSlug}/settings/integrations`,
    },
    {
      label: 'Usage',
      icon: BarChart,
      href: `/${orgSlug}/settings/usage`,
      active: pathname === `/${orgSlug}/settings/usage`,
    },
  ];

  return (
    <div className="flex border-b border-slate-900 overflow-x-auto shrink-0 mb-8 scrollbar-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold transition shrink-0 ${
              tab.active
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

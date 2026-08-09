'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authClient } from '@platform/auth';
import { ChevronDown, Plus, Check, User, Users, Folder, Settings, Shield, PlusCircle, AlertCircle } from 'lucide-react';

export function ScopeSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  
  const [isOpen, setIsOpen] = useState(false);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [activeOrg, setActiveOrg] = useState<any | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamSlug, setNewTeamSlug] = useState('');
  const [createError, setCreateError] = useState('');
  const [loading, setLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load organizations and active session on mount/path change
  useEffect(() => {
    loadOrgs();
    
    // Close dropdown on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pathname]);

  const loadOrgs = async () => {
    try {
      const listRes = await authClient.organization.list();
      const orgList = listRes?.data || [];
      setOrgs(orgList);
      
      const sessionRes = await authClient.getSession();
      const activeId = sessionRes?.data?.session?.activeOrganizationId;
      const active = orgList.find((o) => o.id === activeId);
      if (active) {
        setActiveOrg(active);
      } else if (orgList.length > 0) {
        // Fallback
        setActiveOrg(orgList[0]);
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
    }
  };

  const handleSwitch = async (targetOrg: any) => {
    if (targetOrg.id === activeOrg?.id) {
      setIsOpen(false);
      return;
    }

    try {
      await authClient.organization.setActive({
        organizationId: targetOrg.id,
      });

      // Synchronize equivalent paths
      const pathParts = pathname.split('/').filter(Boolean);
      const oldSlug = pathParts[0];
      
      let nextPath = `/${targetOrg.slug}`;
      if (pathParts.length > 1) {
        // If they are on /settings/... or /projects general tab, preserve the path
        if (pathParts[1] === 'settings' || (pathParts[1] === 'projects' && pathParts.length === 2)) {
          nextPath = `/${targetOrg.slug}/${pathParts.slice(1).join('/')}`;
        }
      }

      setIsOpen(false);
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      console.error('Failed to switch active organization:', err);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName || !newTeamSlug) {
      setCreateError('Please fill in all fields.');
      return;
    }

    setCreateError('');
    setLoading(true);

    try {
      const res = await authClient.organization.create({
        name: newTeamName,
        slug: newTeamSlug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
      });

      if (res?.error) {
        setCreateError(res.error.message || 'Failed to create team.');
      } else {
        setNewTeamName('');
        setNewTeamSlug('');
        setShowCreateDialog(false);
        await loadOrgs();
        
        // Switch to the newly created team organization
        if (res.data) {
          await handleSwitch(res.data);
        }
      }
    } catch (err: any) {
      setCreateError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Sort: PERSONAL first, then TEAMs
  const personalOrgs = orgs.filter((o) => o.kind === 'PERSONAL');
  const teamOrgs = orgs.filter((o) => o.kind !== 'PERSONAL');

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-sm font-semibold transition"
      >
        {activeOrg?.kind === 'PERSONAL' ? (
          <User className="w-4 h-4 text-cyan-400" />
        ) : (
          <Users className="w-4 h-4 text-indigo-400" />
        )}
        <span className="max-w-[120px] truncate">{activeOrg?.name || 'Personal Space'}</span>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 rounded-xl border border-slate-800 bg-slate-950 p-2 shadow-2xl z-50">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-1.5">
            Personal Space
          </div>
          {personalOrgs.map((org) => (
            <button
              key={org.id}
              onClick={() => handleSwitch(org)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left hover:bg-slate-900 transition text-slate-200"
            >
              <div className="flex items-center gap-2.5 truncate">
                <User className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="truncate">{org.name}</span>
              </div>
              {org.id === activeOrg?.id && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
            </button>
          ))}

          {teamOrgs.length > 0 && (
            <>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-1.5 mt-2">
                Team Spaces
              </div>
              {teamOrgs.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSwitch(org)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left hover:bg-slate-900 transition text-slate-200"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Users className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="truncate">{org.name}</span>
                  </div>
                  {org.id === activeOrg?.id && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                </button>
              ))}
            </>
          )}

          <div className="border-t border-slate-900 mt-2 pt-2">
            <button
              onClick={() => {
                setIsOpen(false);
                setShowCreateDialog(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left hover:bg-slate-900 transition text-indigo-400 font-semibold"
            >
              <PlusCircle className="w-4 h-4" />
              Create Team Org
            </button>
          </div>
        </div>
      )}

      {/* Create Team Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl relative">
            <h2 className="text-xl font-bold text-slate-100 mb-2">Create a New Team Organization</h2>
            <p className="text-sm text-slate-400 mb-4">
              Collaborate on incident investigations and log files across a shared repository.
            </p>

            {createError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{createError}</p>
              </div>
            )}

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp Triage"
                  value={newTeamName}
                  onChange={(e) => {
                    setNewTeamName(e.target.value);
                    // Auto-slugify
                    setNewTeamSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
                  }}
                  className="w-full px-4.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 focus:border-indigo-500 outline-none text-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Org Slug (URL identifier)
                </label>
                <input
                  type="text"
                  required
                  placeholder="acme-triage"
                  value={newTeamSlug}
                  onChange={(e) => setNewTeamSlug(e.target.value)}
                  className="w-full px-4.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 focus:border-indigo-500 outline-none text-slate-200 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateDialog(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-750 text-white text-sm font-semibold transition disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Org'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

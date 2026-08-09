'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authClient } from '@platform/auth';
import { api } from '@/lib/api';
import { SettingsTabs } from '@/components/SettingsTabs';
import { Settings, Save, Trash2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function GeneralSettingsPage() {
  const router = useRouter();
  const { orgSlug } = useParams() as { orgSlug: string };

  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadOrgDetails();
  }, [orgSlug]);

  const loadOrgDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const listRes = await authClient.organization.list();
      const active = listRes?.data?.find((o) => o.slug === orgSlug);
      if (active) {
        setOrg(active);
        setName(active.name);
        setSlug(active.slug);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setError('');
    setSuccess('');
    try {
      // Call updateSettings endpoint in API gateway
      const res = await api.patch('/orgs', { name, slug });
      setSuccess('Organization settings updated successfully.');
      
      if (slug !== orgSlug) {
        // Redirection to new slug path
        router.push(`/${slug}/settings/general`);
      } else {
        await loadOrgDetails();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update settings.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you absolutely sure you want to delete this organization? All connected repositories, project hooks, failure records, and vector indices will be permanently deleted.')) {
      return;
    }

    setDeleting(true);
    setError('');
    try {
      await api.delete('/orgs');
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to delete organization.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading settings profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
          Organization Settings
        </h1>
      </div>

      <SettingsTabs />

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
          <p className="text-sm text-green-300">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Profile Card Form */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
          <h3 className="text-base font-bold text-slate-100 mb-4">Organization Profile</h3>
          
          <form onSubmit={handleUpdate} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Organization Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-indigo-500 outline-none text-slate-200 text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Slug (URL Identifier)
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-indigo-500 outline-none text-slate-200 text-sm transition"
              />
            </div>

            <button
              type="submit"
              disabled={updating}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-650 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {updating ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Danger zone delete option (only for TEAM kind orgs) */}
        {org?.kind !== 'PERSONAL' && (
          <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10 shadow-2xl backdrop-blur-xl">
            <h3 className="text-base font-bold text-red-400 mb-2">Danger Zone</h3>
            <p className="text-xs text-slate-400 mb-6">
              Once you delete a team organization, there is no going back. All related members, projects, webhooks, and incident data will be removed immediately.
            </p>

            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-5 py-2.5 rounded-xl bg-red-650 hover:bg-red-600 text-white text-xs font-semibold transition flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting Org...' : 'Delete Organization'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

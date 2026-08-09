'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { SettingsTabs } from '@/components/SettingsTabs';
import { Key, Plus, Eye, Trash2, Calendar, Clipboard, CheckCircle, AlertTriangle, AlertCircle, Shield, Loader2 } from 'lucide-react';

export default function ApiKeysSettingsPage() {
  const { orgSlug } = useParams() as { orgSlug: string };

  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<any[]>([]);
  
  // Create Key states
  const [keyName, setKeyName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['incidents:read']);
  const [expiresDays, setExpiresDays] = useState('30');
  const [createLoading, setCreateLoading] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadApiKeys();
  }, [orgSlug]);

  const loadApiKeys = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await api.get('/orgs/keys');
      setKeys(list || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load API keys.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName) return;

    setCreateLoading(true);
    setError('');
    setSuccess('');
    setNewRawKey(null);

    const expiresAt = expiresDays ? new Date(Date.now() + parseInt(expiresDays) * 24 * 60 * 60 * 1000).toISOString() : undefined;

    try {
      const res = await api.post('/orgs/keys', {
        name: keyName,
        scopes,
        expiresAt,
      });
      setNewRawKey(res.key);
      setKeyName('');
      setSuccess('API key generated successfully.');
      await loadApiKeys();
    } catch (err: any) {
      setError(err.message || 'Failed to create API key.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke this API key? Any applications currently using it will be blocked immediately.')) return;

    setError('');
    setSuccess('');
    try {
      await api.post(`/orgs/keys/${id}/revoke`);
      setSuccess('API key revoked successfully.');
      await loadApiKeys();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke API key.');
    }
  };

  const toggleScope = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const copyToClipboard = () => {
    if (newRawKey) {
      navigator.clipboard.writeText(newRawKey);
      alert('API key copied to clipboard!');
    }
  };

  const availableScopes = [
    { value: 'incidents:read', label: 'incidents:read (Read CI failure incidents)' },
    { value: 'incidents:write', label: 'incidents:write (Triage & resolve failures)' },
    { value: 'projects:read', label: 'projects:read (List active repository project scopes)' },
    { value: 'webhooks:write', label: 'webhooks:write (Publish pipeline failure events)' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading security keys...</p>
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

      {/* Raw key display card (shown exactly once upon creation) */}
      {newRawKey && (
        <div className="p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 shadow-2xl backdrop-blur-xl space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-indigo-300">Copy Your API Key</h3>
              <p className="text-xs text-slate-400 mt-1 leading-normal">
                For security reasons, this key will only be shown to you once. If you lose it, you will need to revoke it and generate a new one.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-950 p-4 rounded-xl border border-slate-900">
            <code className="text-xs text-slate-200 select-all font-mono flex-1 break-all pr-4">{newRawKey}</code>
            <button
              onClick={copyToClipboard}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition text-xs flex items-center gap-1.5 shrink-0"
            >
              <Clipboard className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Create API Key Form */}
        <div className="md:col-span-1 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
          <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Plus className="w-4.5 h-4.5 text-indigo-400" />
            Generate API Key
          </h3>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Key Label Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Jenkins CI Runner"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-900 focus:border-indigo-500 outline-none text-slate-200 text-xs transition"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Key Expiry Limit
              </label>
              <select
                value={expiresDays}
                onChange={(e) => setExpiresDays(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-900 focus:border-indigo-500 outline-none text-slate-200 text-xs transition"
              >
                <option value="7">7 Days</option>
                <option value="30">30 Days</option>
                <option value="90">90 Days</option>
                <option value="365">365 Days</option>
                <option value="">Never Expire</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Authorized Scopes
              </label>
              <div className="space-y-2">
                {availableScopes.map((scope) => (
                  <label key={scope.value} className="flex items-start gap-2.5 text-[11px] text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={scopes.includes(scope.value)}
                      onChange={() => toggleScope(scope.value)}
                      className="rounded bg-slate-950 border-slate-900 text-indigo-500 focus:ring-indigo-550 focus:ring-offset-slate-900 shrink-0 mt-0.5"
                    />
                    <span>{scope.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={createLoading || !keyName || scopes.length === 0}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-701 text-white font-semibold transition text-xs disabled:opacity-50"
            >
              {createLoading ? 'Generating Key...' : 'Create API Key'}
            </button>
          </form>
        </div>

        {/* List API Keys */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
          <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" />
            Active Organization Keys
          </h3>

          <div className="divide-y divide-slate-850">
            {keys.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No active API keys created for this organization.
              </div>
            ) : (
              keys.map((k) => (
                <div key={k.id} className="py-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-200">{k.name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
                        {k.prefix}••••••••
                      </span>
                      {k.scopes.map((s: string) => (
                        <span key={s} className="text-[8px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/5 px-1.5 py-0.25 rounded border border-indigo-500/10">
                          {s}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 font-medium uppercase tracking-wider">
                      {k.lastUsedAt ? `Last Used: ${new Date(k.lastUsedAt).toLocaleString()}` : 'Never Used'}
                      {k.expiresAt && ` · Expires: ${new Date(k.expiresAt).toLocaleDateString()}`}
                    </p>
                  </div>

                  <button
                    onClick={() => handleRevoke(k.id)}
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 hover:text-red-400 transition"
                    title="Revoke API Key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

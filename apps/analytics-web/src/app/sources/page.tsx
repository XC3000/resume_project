'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { authClient } from '@platform/auth';
import { Key, Plus, Trash2, Copy, Check, Eye } from 'lucide-react';

interface ApiKeyItem {
  id: string;
  name: string | null;
  start: string | null;
  createdAt: Date;
  enabled: boolean | null;
}

export default function SourcesPage() {
  const [keysList, setKeysList] = useState<ApiKeyItem[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Raw key display state (shown exactly once on creation)
  const [rawCreatedKey, setRawCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    setLoadingList(true);
    try {
      // Better Auth client list method for API keys
      const res = await authClient.apiKey.list();
      if (res.data && res.data.apiKeys) {
        // Map date strings to Date objects if needed
        const keys = (res.data.apiKeys as any[]).map((k) => ({
          id: k.id,
          name: k.name,
          start: k.start,
          createdAt: new Date(k.createdAt),
          enabled: k.enabled,
        }));
        setKeysList(keys);
      }
    } catch (err) {
      console.error('Failed to load API keys:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || creating) return;
    setCreating(true);
    setRawCreatedKey(null);

    try {
      const res = await authClient.apiKey.create({
        name: newKeyName,
      });

      if (res.error) {
        alert(res.error.message || 'Failed to create API key');
      } else if (res.data) {
        // Better Auth create returns { key: string, ... } containing the raw unhashed key exactly once!
        setRawCreatedKey(res.data.key);
        setNewKeyName('');
        await fetchKeys();
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred creating API key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (revokingId) return;
    const confirmRevoke = confirm('Are you sure you want to revoke this API key? Any active client using it will be blocked instantly.');
    if (!confirmRevoke) return;

    setRevokingId(id);
    try {
      const res = await authClient.apiKey.delete({
        keyId: id,
      });

      if (res.error) {
        alert(res.error.message || 'Failed to revoke API key');
      } else {
        await fetchKeys();
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred revoking API key');
    } finally {
      setRevokingId(null);
    }
  };

  const handleCopyKey = () => {
    if (!rawCreatedKey) return;
    navigator.clipboard.writeText(rawCreatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight gradient-text mb-2">Ingestion API Keys</h1>
          <p className="text-muted-foreground">Provision and revoke API keys to feed the metrics analytics pipeline</p>
        </div>

        {/* Raw Key Banner (Shown exactly once on creation) */}
        {rawCreatedKey && (
          <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20 space-y-4 animate-glow relative overflow-hidden">
            <div className="flex items-center space-x-3 text-primary">
              <Eye className="h-5 w-5" />
              <h3 className="font-bold text-lg">Copy your API Key now!</h3>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              For security reasons, this key will **never** be shown again. Save it immediately to a secure password manager.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
              <code className="flex-1 px-4 py-3 bg-background border border-border rounded-lg text-foreground select-all text-xs break-all flex items-center">
                {rawCreatedKey}
              </code>
              <button
                onClick={handleCopyKey}
                className="px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg flex items-center justify-center space-x-2 transition shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Copied!' : 'Copy Key'}</span>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Create Key Card */}
          <div className="lg:col-span-1 p-6 rounded-2xl glass-panel border border-border">
            <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <Plus className="h-5 w-5 text-primary" />
              <span>Provision Key</span>
            </h2>
            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-muted-foreground">Source / Key Label</label>
                <input
                  type="text"
                  required
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-card border border-border focus:border-primary focus:outline-none transition text-sm text-foreground"
                  placeholder="e.g. production-gateway"
                />
              </div>
              <button
                type="submit"
                disabled={creating || !newKeyName.trim()}
                className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition disabled:opacity-50 text-sm"
              >
                {creating ? 'Generating...' : 'Create API Key'}
              </button>
            </form>
          </div>

          {/* Keys List Table */}
          <div className="lg:col-span-2 p-6 rounded-2xl glass-panel border border-border overflow-hidden">
            <h2 className="text-lg font-bold mb-6 flex items-center space-x-2">
              <Key className="h-5 w-5 text-primary" />
              <span>Active Ingestion Keys</span>
            </h2>

            {loadingList ? (
              <div className="py-8 text-center text-muted-foreground text-sm animate-pulse">Loading API keys...</div>
            ) : keysList.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                No active ingestion keys found. Generate a key above to start enqueuing data.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-foreground/80">
                  <thead className="border-b border-border text-muted-foreground text-xs uppercase">
                    <tr>
                      <th className="py-3 px-4">Label</th>
                      <th className="py-3 px-4">Start Prefix</th>
                      <th className="py-3 px-4">Created At</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {keysList.map((key) => (
                      <tr key={key.id} className="hover:bg-card/20 transition">
                        <td className="py-3.5 px-4 font-semibold text-foreground truncate max-w-[150px]">
                          {key.name || 'Unnamed key'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs">
                          {key.start ? `${key.start}••••••••` : '••••••••'}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted-foreground">
                          {key.createdAt.toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleRevokeKey(key.id)}
                            disabled={revokingId === key.id}
                            className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition disabled:opacity-50"
                            title="Revoke key"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { SettingsTabs } from '@/components/SettingsTabs';
import { Github, Cable, CheckCircle2, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

export default function IntegrationsSettingsPage() {
  const { orgSlug } = useParams() as { orgSlug: string };

  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [installationInfo, setInstallationInfo] = useState<any | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkIntegrationStatus();
  }, [orgSlug]);

  const checkIntegrationStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const repos = await api.get('/github/repos');
      if (repos && repos.length > 0) {
        setConnected(true);
        // Fill simulated installation metadata
        setInstallationInfo({
          accountLogin: 'acme-org',
          accountType: 'Organization',
          installationId: '54321',
          repositorySelection: 'All Repositories',
        });
      } else {
        setConnected(false);
      }
    } catch (err) {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateSync = async () => {
    setSyncing(true);
    try {
      await api.get('/github/setup?installation_id=54321&setup_action=install');
      await checkIntegrationStatus();
      alert('GitHub synchronization completed!');
    } catch (err: any) {
      setError(err.message || 'Failed to sync integration.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading integration channels...</p>
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

      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-xl max-w-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-center shrink-0">
            <Github className="w-6 h-6 text-slate-350" />
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-200">GitHub App Integration</h3>
                {connected && (
                  <span className="flex items-center gap-1 text-[10px] text-green-400 font-bold uppercase tracking-wider bg-green-500/5 px-2 py-0.5 border border-green-500/10 rounded-md">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Authorized
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-normal">
                Import code repositories, listen to workflow pipeline runs, and automatically ingest failures.
              </p>
            </div>

            {connected && installationInfo ? (
              <div className="p-4.5 rounded-xl bg-slate-950/60 border border-slate-900 text-xs space-y-2.5 font-semibold text-slate-400">
                <div className="flex justify-between">
                  <span>GitHub Org:</span>
                  <span className="text-slate-200 font-bold font-mono">{installationInfo.accountLogin}</span>
                </div>
                <div className="flex justify-between">
                  <span>Account Type:</span>
                  <span className="text-slate-300 font-medium">{installationInfo.accountType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Installation ID:</span>
                  <span className="text-slate-300 font-mono">{installationInfo.installationId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Selection Scope:</span>
                  <span className="text-slate-350">{installationInfo.repositorySelection}</span>
                </div>
              </div>
            ) : (
              <div className="p-4.5 rounded-xl bg-slate-950/60 border border-slate-900 text-xs text-slate-500 text-center">
                GitHub App has not been connected to this workspace organization yet.
              </div>
            )}

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={handleSimulateSync}
                disabled={syncing}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition text-xs flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Synchronizing...' : connected ? 'Sync Repositories' : 'Connect GitHub App'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

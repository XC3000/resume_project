'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { SettingsTabs } from '@/components/SettingsTabs';
import { Github, Cable, CheckCircle2, XCircle, RefreshCw, AlertCircle, Link, Globe, Calendar, Loader2 } from 'lucide-react';

export default function IntegrationsSettingsPage() {
  const { orgSlug } = useParams() as { orgSlug: string };

  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [installationInfo, setInstallationInfo] = useState<any | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadIntegrationsDetails();
  }, [orgSlug]);

  const loadIntegrationsDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/orgs/integrations');
      setProjects(data.projects || []);
      setDeliveries(data.deliveries || []);
      
      const repos = await api.get('/github/repos').catch(() => []);
      if (repos && repos.length > 0) {
        setConnected(true);
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
      await loadIntegrationsDetails();
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT/MIDDLE: Installation info & connected projects list */}
        <div className="lg:col-span-2 space-y-6">
          {/* GitHub App connection status */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
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
                    <div className="flex justify-between font-medium">
                      <span>GitHub Org:</span>
                      <span className="text-slate-200 font-bold font-mono">{installationInfo.accountLogin}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Account Type:</span>
                      <span className="text-slate-300">{installationInfo.accountType}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Installation ID:</span>
                      <span className="text-slate-300 font-mono">{installationInfo.installationId}</span>
                    </div>
                    <div className="flex justify-between font-medium">
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

          {/* Connected repos & project webhook status */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Link className="w-5 h-5 text-indigo-400" />
              Connected Repositories & Webhooks
            </h3>

            {projects.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 italic text-center">No active projects connected.</p>
            ) : (
              <div className="divide-y divide-slate-850">
                {projects.map((project) => (
                  <div key={project.id} className="py-4.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-200">{project.name}</span>
                      <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider bg-green-500/5 px-2 py-0.5 border border-green-500/10 rounded-md">
                        Webhook Active
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950/65 rounded-xl border border-slate-900 text-[10px] text-slate-400 space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Generic Webhook URL:</span>
                        <code className="text-slate-250 font-mono select-all select-text break-all">
                          http://localhost:3000/webhooks/generic/{project.id}
                        </code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Secret:</span>
                        <code className="text-slate-250 font-mono select-all">{project.webhookSecret}</code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Recent Deliveries & Outcomes log */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
            <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Globe className="w-4.5 h-4.5 text-indigo-400" />
              Recent Deliveries
            </h3>

            {deliveries.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 italic text-center leading-normal">
                No webhook deliveries recorded for this organization workspace.
              </p>
            ) : (
              <div className="space-y-4">
                {deliveries.map((d) => (
                  <div key={d.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-900 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-300 font-mono truncate">{d.eventType}</span>
                      {d.status === 'SUCCESS' ? (
                        <span className="flex items-center gap-1 text-[9px] text-green-400 font-bold uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Success
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[9px] text-red-400 font-bold uppercase tracking-wider">
                          <XCircle className="w-3.5 h-3.5" />
                          Failed
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-500 space-y-1">
                      <p className="font-mono">ID: {d.deliveryId.slice(0, 8)}...</p>
                      <p className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(d.receivedAt).toLocaleString()}
                      </p>
                      {d.error && (
                        <p className="text-red-400/90 font-mono text-[9px] mt-1 bg-red-500/5 p-1.5 rounded border border-red-500/10 select-text leading-relaxed">
                          {d.error}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

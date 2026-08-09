'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { SettingsTabs } from '@/components/SettingsTabs';
import { BarChart3, ShieldAlert, Cpu, Sparkles, CheckCircle, Loader2 } from 'lucide-react';

export default function UsageSettingsPage() {
  const { orgSlug } = useParams() as { orgSlug: string };

  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLlmUsage();
  }, [orgSlug]);

  const loadLlmUsage = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/orgs/usage');
      setUsage(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load usage data.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate sum of tokens
  const totalCalls = usage.reduce((sum, item) => sum + item.callCount, 0);
  const totalTokensIn = usage.reduce((sum, item) => sum + item.tokensIn, 0);
  const totalTokensOut = usage.reduce((sum, item) => sum + item.tokensOut, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading usage charts...</p>
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
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Usage summary widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-md backdrop-blur-md">
          <div className="flex items-center gap-2 text-slate-500">
            <Sparkles className="w-4.5 h-4.5 text-indigo-400" />
            <span className="text-xs uppercase tracking-wider font-semibold">Gemini Queries</span>
          </div>
          <p className="text-3xl font-bold mt-2 text-slate-200">{totalCalls}</p>
        </div>
        
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-md backdrop-blur-md">
          <div className="flex items-center gap-2 text-slate-500">
            <Cpu className="w-4.5 h-4.5 text-purple-400" />
            <span className="text-xs uppercase tracking-wider font-semibold">Tokens In</span>
          </div>
          <p className="text-3xl font-bold mt-2 text-slate-200">{totalTokensIn.toLocaleString()}</p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-md backdrop-blur-md">
          <div className="flex items-center gap-2 text-slate-500">
            <Cpu className="w-4.5 h-4.5 text-pink-400" />
            <span className="text-xs uppercase tracking-wider font-semibold">Tokens Out</span>
          </div>
          <p className="text-3xl font-bold mt-2 text-slate-200">{totalTokensOut.toLocaleString()}</p>
        </div>
      </div>

      {/* Plan quota info */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-xl max-w-3xl">
        <h3 className="text-base font-bold text-slate-100 mb-2">Free-tier Sandbox Allowances</h3>
        <p className="text-xs text-slate-400 leading-normal mb-4">
          Tenants are configured with a complimentary Gemini token usage pool of up to 100 API queries per day.
        </p>

        <div className="w-full bg-slate-950 rounded-xl border border-slate-900 overflow-hidden divide-y divide-slate-900">
          <div className="p-4 flex items-center justify-between text-xs">
            <span className="text-slate-400">Day Quota limit:</span>
            <span className="text-slate-200 font-bold">100 / Day</span>
          </div>
          <div className="p-4 flex items-center justify-between text-xs">
            <span className="text-slate-400">Classification Model:</span>
            <span className="text-indigo-400 font-bold font-mono">gemini-2.5-flash</span>
          </div>
          <div className="p-4 flex items-center justify-between text-xs">
            <span className="text-slate-400">Embeddings Model:</span>
            <span className="text-indigo-400 font-bold font-mono">text-embedding-004 (768d)</span>
          </div>
        </div>
      </div>

      {/* Recent usages list table */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
        <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4.5 h-4.5 text-indigo-400" />
          Consumption History (Last 30 Days)
        </h3>

        {usage.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm leading-normal">
            No LLM token consumption recorded today. AI operations are billed dynamically based on your classification volume.
          </div>
        ) : (
          <div className="divide-y divide-slate-850">
            {usage.map((item) => (
              <div key={item.id} className="py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    {new Date(item.day).toLocaleDateString()}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 font-semibold uppercase tracking-wider">
                    In: {item.tokensIn.toLocaleString()} · Out: {item.tokensOut.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-indigo-400">
                    {item.callCount} calls
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

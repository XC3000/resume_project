'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ShieldAlert, AlertTriangle, CheckCircle, ArrowRight, Clock, ShieldX, HelpCircle, Loader2 } from 'lucide-react';

export default function IncidentsPage() {
  const router = useRouter();
  const { orgSlug, projectSlug } = useParams() as { orgSlug: string; projectSlug: string };

  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  const [error, setError] = useState('');

  useEffect(() => {
    loadIncidents();
  }, [orgSlug, projectSlug]);

  const loadIncidents = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await api.get(`/triage/projects/${projectSlug}/incidents`);
      setIncidents(list || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load incidents.');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'HIGH':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'MEDIUM':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'RESOLVED') {
      return (
        <span className="flex items-center gap-1 text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider">
          <CheckCircle className="w-3 h-3" />
          Resolved
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider">
        <Clock className="w-3 h-3" />
        Open
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading build failure logs...</p>
      </div>
    );
  }

  const filteredIncidents = incidents.filter((inc) => {
    if (filter === 'OPEN') return inc.status === 'OPEN';
    if (filter === 'RESOLVED') return inc.status === 'RESOLVED';
    return true;
  });

  const openCount = incidents.filter((i) => i.status === 'OPEN').length;
  const criticalCount = incidents.filter((i) => i.severity === 'CRITICAL').length;

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Link
          href={`/${orgSlug}/projects`}
          className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition"
        >
          &larr; Back to projects
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-450 bg-clip-text text-transparent">
            Project: {projectSlug}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Browse ingested failures, inspect stack traces, and classify logs with Gemini AI.
          </p>
        </div>

        {/* Filter controls tabs */}
        <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-850 self-start">
          {(['ALL', 'OPEN', 'RESOLVED'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === t
                  ? 'bg-slate-900 text-slate-100 shadow-md border border-slate-800'
                  : 'text-slate-500 hover:text-slate-355 border border-transparent'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-md backdrop-blur-md">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Failures</p>
          <p className="text-3xl font-bold mt-2 text-slate-200">{incidents.length}</p>
        </div>
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-md backdrop-blur-md">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Active Failures</p>
          <p className="text-3xl font-bold mt-2 text-red-400">{openCount}</p>
        </div>
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-md backdrop-blur-md">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Critical Priority</p>
          <p className="text-3xl font-bold mt-2 text-amber-500">{criticalCount}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <ShieldX className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Incidents items listing table */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
        {filteredIncidents.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No incidents matched the active filter selection.
          </div>
        ) : (
          <div className="divide-y divide-slate-850">
            {filteredIncidents.map((incident) => (
              <Link
                key={incident.id}
                href={`/${orgSlug}/projects/${projectSlug}/incidents/${incident.id}`}
                className="py-5 flex items-center justify-between gap-4 group transition"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-850 shrink-0 group-hover:bg-slate-900 transition">
                    {incident.severity === 'CRITICAL' ? (
                      <ShieldAlert className="w-5 h-5 text-red-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center flex-wrap gap-2">
                      <h3 className="text-sm font-bold text-slate-200 group-hover:text-indigo-400 transition">
                        {incident.title}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider ${getSeverityColor(incident.severity)}`}>
                        {incident.severity}
                      </span>
                      {getStatusBadge(incident.status)}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl line-clamp-1">
                      {incident.rootCauseHint || 'AI analysis pending... Logs processing in background.'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-2.5">
                      Ingested {new Date(incident.detectedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="text-slate-500 group-hover:text-indigo-400 transition shrink-0">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

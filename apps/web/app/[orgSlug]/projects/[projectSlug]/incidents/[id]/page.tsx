'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ShieldAlert, AlertTriangle, CheckCircle, Terminal, Cpu, FileText, Send, Save, ArrowLeft, Loader2, Info } from 'lucide-react';

export default function IncidentDetailsPage() {
  const router = useRouter();
  const { orgSlug, projectSlug, id } = useParams() as {
    orgSlug: string;
    projectSlug: string;
    id: string;
  };

  const [loading, setLoading] = useState(true);
  const [incident, setIncident] = useState<any | null>(null);
  const [similarIncidents, setSimilarIncidents] = useState<any[]>([]);
  const [highlightedChunkId, setHighlightedChunkId] = useState<string | null>(null);
  
  // Triage state mutation inputs
  const [rootCause, setRootCause] = useState('');
  const [suggestedFix, setSuggestedFix] = useState('');
  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadIncidentDetails();
  }, [orgSlug, projectSlug, id]);

  const loadIncidentDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const [data, similar] = await Promise.all([
        api.get(`/triage/incidents/${id}`),
        api.get(`/triage/incidents/${id}/similar`).catch(() => []),
      ]);
      setIncident(data);
      setSimilarIncidents(similar || []);
      setRootCause(data.rootCauseHint || '');
      setSuggestedFix(data.suggestedFix || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load incident details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setError('');
    try {
      await api.patch(`/triage/incidents/${id}/analysis`, {
        rootCauseHint: rootCause,
        suggestedFix,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save analysis.');
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async () => {
    setResolving(true);
    setError('');
    try {
      await api.post(`/triage/incidents/${id}/resolve`);
      await loadIncidentDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to resolve incident.');
    } finally {
      setResolving(false);
    }
  };

  const handleJumpToEvidence = () => {
    const evidenceChunk = incident.contextChunks?.find((c: any) => c.justifies);
    if (evidenceChunk) {
      setHighlightedChunkId(evidenceChunk.id);
      const el = document.getElementById(`chunk-${evidenceChunk.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTimeout(() => {
        setHighlightedChunkId(null);
      }, 2500);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Ingesting Gemini analysis context...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400">Incident could not be found.</p>
        <Link href={`/${orgSlug}/projects/${projectSlug}/incidents`} className="text-indigo-400 mt-4 block">
          Return to incidents list
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col space-y-6">
      {/* Navigation header row */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/${orgSlug}/incidents`}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
              Incident #{incident.id.slice(0, 8)}
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${
                incident.status === 'RESOLVED'
                  ? 'text-green-400 bg-green-500/10 border-green-500/20'
                  : 'text-red-400 bg-red-500/10 border-red-500/20'
              }`}>
                {incident.status}
              </span>
            </h1>
            <p className="text-xs text-slate-500">{incident.title}</p>
          </div>
        </div>

        {incident.status === 'OPEN' && (
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="px-4.5 py-2 rounded-xl bg-green-650 hover:bg-green-600 text-white font-semibold transition text-xs flex items-center gap-2 shadow-lg shadow-green-500/10 disabled:opacity-50"
          >
            {resolving ? 'Resolving...' : 'Mark as Resolved'}
            <CheckCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 shrink-0">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Main split-screen panel container */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* LEFT PANEL: Log outputs */}
        <div className="flex-1 rounded-2xl bg-slate-950 border border-slate-900 flex flex-col min-h-[300px] lg:min-h-0">
          <div className="px-5 py-3.5 border-b border-slate-900/60 bg-slate-950/40 flex items-center justify-between shrink-0">
            <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
              <Terminal className="w-4 h-4 text-indigo-400" />
              Build Log Region Context
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">
              Total Chunks: {incident.contextChunks?.length || 0}
            </span>
          </div>

          <div className="flex-1 p-5 overflow-y-auto font-mono text-xs leading-relaxed text-slate-300 select-text space-y-4">
            {incident.contextChunks && incident.contextChunks.length > 0 ? (
              incident.contextChunks.map((chunk: any) => (
                <div
                  key={chunk.id}
                  id={`chunk-${chunk.id}`}
                  className={`group relative p-4.5 rounded-xl border transition-all duration-300 ${
                    chunk.justifies
                      ? 'bg-red-500/5 border-red-500/15'
                      : 'bg-slate-900/20 border-slate-850'
                  } ${
                    chunk.id === highlightedChunkId
                      ? 'ring-2 ring-indigo-500 border-transparent scale-[1.01] shadow-lg shadow-indigo-500/10'
                      : ''
                  }`}
                >
                  {/* Floating byte offsets badge */}
                  <div className="absolute right-3.5 top-3.5 opacity-0 group-hover:opacity-100 transition duration-150 flex items-center gap-1.5 bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-[9px] text-slate-500">
                    <Info className="w-3 h-3" />
                    <span>Bytes: {chunk.startOffset} - {chunk.endOffset}</span>
                  </div>

                  {chunk.justifies && (
                    <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      Trigger Log Region Highlighted by Gemini
                    </div>
                  )}

                  <pre className="whitespace-pre-wrap font-mono break-all text-slate-350">{chunk.content}</pre>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                No logs loaded for this incident.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: AI diagnosis and triage analysis inputs */}
        <div className="w-full lg:w-96 rounded-2xl bg-slate-900/20 border border-slate-800/80 flex flex-col min-h-[350px] lg:min-h-0 shadow-lg backdrop-blur-md">
          <div className="px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between shrink-0">
            <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
              <Cpu className="w-4 h-4 text-purple-400" />
              Gemini AI Copilot Report
            </h3>
          </div>

          <div className="flex-1 p-5 overflow-y-auto space-y-6">
            
            {/* Auto Diagnosis Classification */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Gemini Classification
              </span>
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900/80">
                <p className="text-sm font-bold text-slate-200">
                  {incident.classification || 'Unclassified Stack trace'}
                </p>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Severity: <strong className="text-amber-500 font-bold">{incident.severity}</strong>
                  </span>
                  
                  {incident.contextChunks?.some((c: any) => c.justifies) && (
                    <button
                      onClick={handleJumpToEvidence}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 transition"
                    >
                      <Terminal className="w-3 h-3" />
                      Jump to Evidence
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Editable triage comments fields form */}
            <form onSubmit={handleSaveAnalysis} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Root Cause Summary
                </label>
                <textarea
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  placeholder="Root cause hints details..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-900 focus:border-indigo-500 outline-none text-slate-200 text-xs transition leading-relaxed resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Suggested Actionable Fix
                </label>
                <textarea
                  value={suggestedFix}
                  onChange={(e) => setSuggestedFix(e.target.value)}
                  placeholder="Steps to resolve build failure..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-900 focus:border-indigo-500 outline-none text-slate-200 text-xs transition leading-relaxed resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                {saveSuccess ? (
                  <span className="text-xs text-green-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    Changes saved
                  </span>
                ) : (
                  <div />
                )}
                
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition text-xs flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save Triage Note'}
                </button>
              </div>
            </form>

            {/* Similar Past Incidents panel */}
            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Similar Past Incidents
              </span>
              
              {similarIncidents.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No similar historical failures found.</p>
              ) : (
                <div className="space-y-2.5">
                  {similarIncidents.slice(0, 3).map((item: any) => (
                    <Link
                      key={item.id}
                      href={`/${orgSlug}/projects/${projectSlug}/incidents/${item.id}`}
                      className="block p-3 rounded-xl bg-slate-950/40 border border-slate-900/80 hover:border-indigo-500/20 hover:bg-slate-900/20 transition text-left group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-350 group-hover:text-indigo-400 truncate">
                          {item.title}
                        </span>
                        <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-1.5 py-0.5 rounded">
                          {Math.round(item.similarity * 100)}% Match
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 font-mono">
                        Incident ID: #{item.id.slice(0, 8)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

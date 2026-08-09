"use client";

import { useState } from "react";
import { Sparkles, Play, RefreshCw, CheckCircle, AlertTriangle, ShieldAlert, Cpu, ArrowRight } from "lucide-react";

const PRESET_INCIDENTS = [
  {
    id: "eaddrinuse",
    title: "EADDRINUSE: Port 3000 in use",
    log: "Error: listen EADDRINUSE: address already in use :::3000 at Server.setupListenHandle [as _listen2] (node:net:1940:16)",
    severity: "P1 - HIGH",
    category: "Network / Port Binding",
    rootCause: "A lingering Node process (PID 5122) is listening on port 3000.",
    fix: "Run `kill -9 $(lsof -t -i:3000)` or update PORT in .env.",
    similarityScore: "0.012 (Direct Match)",
  },
  {
    id: "prisma_p2002",
    title: "Prisma Unique Constraint Violation (P2002)",
    log: "PrismaClientKnownRequestError: Unique constraint failed on the fields: (`email`) in shared.users",
    severity: "P2 - MEDIUM",
    category: "Database Constraint",
    rootCause: "Duplicate account creation payload sent without pre-flight validation.",
    fix: "Implement upsert or catch Prisma P2002 error in auth.service.ts.",
    similarityScore: "0.038 (High Similarity)",
  },
  {
    id: "upstash_econnrefused",
    title: "Supabase Direct IP ECONNREFUSED",
    log: "TCP connection to db.epzxkkdaujrlyuujeynb.supabase.co:5432 FAILED: connect ECONNREFUSED 2406:da18:...",
    severity: "P0 - CRITICAL",
    category: "Infrastructure / IPv6",
    rootCause: "Direct port 5432 lacks IPv4 fallback on default free-tier endpoint.",
    fix: "Switch DATABASE_URL to Supabase pooler host: aws-0-ap-southeast-1.pooler.supabase.com:6543.",
    similarityScore: "0.004 (Exact Historical Incident)",
  },
];

export function IncidentSimulator() {
  const [selectedPreset, setSelectedPreset] = useState(PRESET_INCIDENTS[0]);
  const [customLog, setCustomLog] = useState(PRESET_INCIDENTS[0].log);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<typeof PRESET_INCIDENTS[0] | null>(PRESET_INCIDENTS[0]);

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    setResult(null);

    setTimeout(() => {
      setIsAnalyzing(false);
      // Find matching preset or generate dynamic response
      const match = PRESET_INCIDENTS.find((p) => p.log === customLog) || {
        id: "custom",
        title: "Custom Unhandled Stack Trace",
        log: customLog,
        severity: "P1 - HIGH",
        category: "Unhandled Exception",
        rootCause: "Unexpected runtime failure detected in execution stack.",
        fix: "Inspect stack frame and verify environment variables.",
        similarityScore: "0.065 (Vector Match)",
      };
      setResult(match);
    }, 1200);
  };

  const handleSelectPreset = (preset: typeof PRESET_INCIDENTS[0]) => {
    setSelectedPreset(preset);
    setCustomLog(preset.log);
    setResult(preset);
  };

  return (
    <section id="simulator" className="py-20 bg-slate-950/60 relative border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/50 text-xs font-mono text-cyan-300 mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Interactive Playground</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Test AI Triage in Real Time
          </h2>
          <p className="mt-3 text-slate-400 text-base">
            Select a sample incident log or paste a stack trace to watch Gemini AI classification and pgvector matching in action.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Preset selector & Log Input */}
          <div className="lg:col-span-6 glass-panel rounded-2xl p-6 space-y-6">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                1. Select Sample Incident
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {PRESET_INCIDENTS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPreset(p)}
                    className={`px-3 py-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                      selectedPreset.id === p.id
                        ? "bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <div className="font-semibold truncate">{p.title}</div>
                    <div className="text-[10px] text-slate-500 mt-1">{p.category}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                2. Input Log / Stack Trace
              </label>
              <textarea
                value={customLog}
                onChange={(e) => setCustomLog(e.target.value)}
                rows={4}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none"
                placeholder="Paste error stack trace here..."
              />
            </div>

            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Computing Vector Embedding & Classifying...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" />
                  <span>Run AI Triage Analysis</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: AI Triage Output Card */}
          <div className="lg:col-span-6 glass-card rounded-2xl p-6 border border-slate-800 relative">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-5">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="h-5 w-5 text-cyan-400" />
                <span className="font-bold text-sm text-white">AI Analysis Output</span>
              </div>
              {result && (
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/50 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Auto-Diagnosed
                </span>
              )}
            </div>

            {isAnalyzing && (
              <div className="py-16 text-center space-y-4">
                <div className="inline-block p-4 rounded-full bg-cyan-950/60 border border-cyan-500/30 animate-bounce">
                  <Cpu className="h-8 w-8 text-cyan-400" />
                </div>
                <p className="text-xs font-mono text-slate-400">
                  Executing <span className="text-cyan-300">halfvec(768)</span> similarity match in pgvector...
                </p>
              </div>
            )}

            {!isAnalyzing && result && (
              <div className="space-y-4 text-xs font-sans animate-fadeIn">
                {/* Severity & Category Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Assigned Severity
                    </span>
                    <span className="font-bold text-rose-400 text-sm flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" /> {result.severity}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Vector Distance
                    </span>
                    <span className="font-mono text-cyan-300 text-sm font-semibold">
                      {result.similarityScore}
                    </span>
                  </div>
                </div>

                {/* Root Cause Diagnosis */}
                <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                    Identified Root Cause
                  </span>
                  <p className="text-slate-200 text-xs leading-relaxed font-medium">
                    {result.rootCause}
                  </p>
                </div>

                {/* Recommended Resolution */}
                <div className="bg-cyan-950/40 rounded-xl p-4 border border-cyan-800/40">
                  <span className="text-[10px] uppercase font-bold text-cyan-400 block mb-1.5 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Recommended Automated Fix
                  </span>
                  <code className="text-cyan-200 font-mono text-xs block bg-slate-950/80 p-2.5 rounded border border-cyan-900/60">
                    {result.fix}
                  </code>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

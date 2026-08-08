"use client";

import { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Terminal, CheckCircle2, ShieldCheck, Zap, Database, Cpu } from "lucide-react";

export function Hero() {
  const [terminalStep, setTerminalStep] = useState(0);

  const logs = [
    { type: "in", text: "POST /triage/webhooks/github -> Event: issue_comment.created (repo: platform/api)" },
    { type: "sys", text: "HMAC Signature verified (timingSafeEqual) [sha256=9f8a...]" },
    { type: "ai", text: "Embedding generated via Gemini AI (halfvec: 768 dims)" },
    { type: "db", text: "pgvector similarity search matching incident #402 (distance: 0.041)" },
    { type: "queue", text: "Dispatched BullMQ task to Upstash Redis -> Queue: triage-tasks [Job #891]" },
    { type: "out", text: "AUTO-RESOLVED: Assigned severity CRITICAL (P0), auto-linked fix PR #104" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setTerminalStep((prev) => (prev + 1) % (logs.length + 1));
    }, 2200);
    return () => clearInterval(timer);
  }, [logs.length]);

  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-cyan-500/15 via-indigo-500/15 to-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-xs text-slate-300 shadow-xl backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-semibold text-cyan-300">Powered by pgvector & BullMQ</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Zero In-Process ML Latency</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.1]">
            Automated Incident Triage & <br />
            <span className="gradient-text">Root Cause Analysis in Seconds</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-slate-300 font-normal leading-relaxed max-w-2xl mx-auto">
            Ingest GitHub webhooks, classify stack traces with Gemini AI, perform similarity matching using{" "}
            <code className="text-cyan-300 font-mono text-sm px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50">halfvec(768)</code>, and dispatch async BullMQ workers automatically.
          </p>

          {/* CTA Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#simulator"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4 text-cyan-200" />
              <span>Test Interactive Simulator</span>
              <ArrowRight className="h-4 w-4" />
            </a>

            <a
              href="#architecture"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-700 bg-slate-900/80 text-slate-200 font-semibold text-sm hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
            >
              <Cpu className="h-4 w-4 text-slate-400" />
              <span>Explore Architecture</span>
            </a>
          </div>

          {/* Live Feature Badges */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              <span>pgvector halfvec(768)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              <span>BullMQ + Upstash Redis</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              <span>Better Auth Server & Client</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              <span>Supabase Postgres Pooled</span>
            </div>
          </div>
        </div>

        {/* Animated Terminal Block */}
        <div className="mt-12 max-w-4xl mx-auto rounded-2xl glass-panel p-2 shadow-2xl border border-slate-700/60 gradient-border">
          <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-900">
            {/* Terminal Header */}
            <div className="px-4 py-3 bg-slate-900/90 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-mono text-slate-400 flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-cyan-400" /> triage-worker.log — NestJS 11 + BullMQ
                </span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>LIVE FEED</span>
              </div>
            </div>

            {/* Terminal Body */}
            <div className="p-5 font-mono text-xs space-y-3 min-h-[220px] bg-[#090d16]">
              {logs.slice(0, terminalStep).map((log, idx) => (
                <div key={idx} className="flex items-start space-x-3 animate-fadeIn">
                  <span className="text-slate-600 select-none">[{new Date().toLocaleTimeString()}]</span>
                  {log.type === "in" && <span className="text-cyan-400 font-semibold">[WEBHOOK]</span>}
                  {log.type === "sys" && <span className="text-emerald-400 font-semibold">[AUTH]</span>}
                  {log.type === "ai" && <span className="text-purple-400 font-semibold">[GEMINI]</span>}
                  {log.type === "db" && <span className="text-amber-400 font-semibold">[PGVECTOR]</span>}
                  {log.type === "queue" && <span className="text-indigo-400 font-semibold">[BULLMQ]</span>}
                  {log.type === "out" && <span className="text-cyan-300 font-bold">[ACTION]</span>}
                  <span className="text-slate-200">{log.text}</span>
                </div>
              ))}
              {terminalStep === 0 && (
                <div className="text-slate-500 italic">Listening for incoming GitHub webhook events...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

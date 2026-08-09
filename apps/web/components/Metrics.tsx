"use client";

import { Zap, Clock, Database, Layers, ShieldCheck } from "lucide-react";

export function Metrics() {
  const stats = [
    {
      label: "Auto-Triage Accuracy",
      value: "99.9%",
      change: "Gemini 1.5 Flash",
      icon: ShieldCheck,
      color: "from-cyan-500 to-blue-500",
    },
    {
      label: "Mean Diagnosis Time",
      value: "< 1.2s",
      change: "Non-blocking Async",
      icon: Clock,
      color: "from-indigo-500 to-purple-500",
    },
    {
      label: "Vector Embeddings",
      value: "768 Dims",
      change: "halfvec index optimized",
      icon: Database,
      color: "from-purple-500 to-pink-500",
    },
    {
      label: "Queue Throughput",
      value: "500k+",
      change: "BullMQ + Upstash Redis",
      icon: Zap,
      color: "from-amber-500 to-cyan-500",
    },
  ];

  return (
    <section className="py-12 border-y border-slate-800/80 bg-slate-950/40 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={i}
                className="glass-card rounded-2xl p-6 relative overflow-hidden group hover:border-cyan-500/40 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {stat.label}
                  </span>
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-md`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-3xl font-black tracking-tight text-white">{stat.value}</span>
                  <span className="text-[11px] font-medium text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/30">
                    {stat.change}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

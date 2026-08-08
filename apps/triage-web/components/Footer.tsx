"use client";

import { ShieldAlert, Github, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-[#04060d] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-500 p-[1px]">
                <div className="h-full w-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                  <ShieldAlert className="h-4 w-4 text-cyan-400" />
                </div>
              </div>
              <span className="font-extrabold text-lg tracking-tight text-white">
                Triage<span className="text-cyan-400">.ai</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automated Incident Triage, Root Cause Analysis, and pgvector similarity matching for high-velocity software engineering teams.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">Platform</h4>
            <ul className="space-y-2.5 text-xs text-slate-400 font-medium">
              <li><a href="#features" className="hover:text-cyan-400 transition-colors">Features</a></li>
              <li><a href="#simulator" className="hover:text-cyan-400 transition-colors">Interactive Simulator</a></li>
              <li><a href="#architecture" className="hover:text-cyan-400 transition-colors">System Architecture</a></li>
              <li><a href="#pricing" className="hover:text-cyan-400 transition-colors">Pricing Plans</a></li>
            </ul>
          </div>

          {/* Architecture Tech Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">Core Tech Stack</h4>
            <ul className="space-y-2.5 text-xs text-slate-400 font-medium">
              <li><span>Next.js 15 (App Router)</span></li>
              <li><span>NestJS 11 + Express Raw</span></li>
              <li><span>Supabase Postgres + pgvector</span></li>
              <li><span>Upstash Redis + BullMQ</span></li>
            </ul>
          </div>

          {/* System Status */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">System Status</h4>
            <div className="glass-panel p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-emerald-400">All Systems Operational</span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                API: 100% | Vector Index: Active | Queue: Idle
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Triage AI Platform. All rights reserved.</p>
          <div className="flex items-center space-x-1 mt-4 sm:mt-0">
            <span>Built with NestJS, Next.js & Supabase</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

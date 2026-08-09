'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { registerApiInterceptor } from '../lib/api';

const ColdStartContext = createContext<{
  isWakingUp: boolean;
} | null>(null);

export function ColdStartProvider({ children }: { children: React.ReactNode }) {
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [activeRequests, setActiveRequests] = useState(0);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    registerApiInterceptor({
      onStart: () => {
        setActiveRequests((prev) => {
          const next = prev + 1;
          if (next === 1 && !timeoutId) {
            timeoutId = setTimeout(() => {
              setIsWakingUp(true);
            }, 1200);
          }
          return next;
        });
      },
      onEnd: () => {
        setActiveRequests((prev) => {
          const next = Math.max(0, prev - 1);
          if (next === 0) {
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            setIsWakingUp(false);
          }
          return next;
        });
      },
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      registerApiInterceptor({ onStart: () => {}, onEnd: () => {} });
    };
  }, []);

  return (
    <ColdStartContext.Provider value={{ isWakingUp }}>
      {children}
      <AnimatePresence>
        {isWakingUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030712]/85 backdrop-blur-md px-6 text-center"
          >
            <div className="relative max-w-md p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
              {/* Pulsing neon outer circle */}
              <div className="absolute inset-0 -z-10 bg-indigo-500/10 blur-xl rounded-full" />
              
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-cyan-400"
                />
                <div className="absolute inset-3 rounded-full bg-[#030712] flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="w-4 h-4 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50"
                  />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
                Waking Up System...
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Our free-tier AI copilot backend goes to sleep when idle. We are powering it up now — this may take up to 40 seconds.
              </p>
              
              <div className="relative w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 40, ease: "linear" }}
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 h-full rounded-full"
                />
              </div>
              <p className="text-xs text-slate-500 mt-3 italic animate-pulse">
                Initializing safe tenant sandbox...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ColdStartContext.Provider>
  );
}

export function useColdStart() {
  const ctx = useContext(ColdStartContext);
  if (!ctx) throw new Error('useColdStart must be used within ColdStartProvider');
  return ctx;
}

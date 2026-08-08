'use client';

import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Activity, Database, Clock, RefreshCw, Zap } from 'lucide-react';

interface MetricTick {
  time: string;
  eventsPerSec: number;
}

export default function DashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [eventsPerSec, setEventsPerSec] = useState<number>(0);
  const [p50Latency, setP50Latency] = useState<number>(0);
  const [p95Latency, setP95Latency] = useState<number>(0);
  const [chartData, setChartData] = useState<MetricTick[]>([]);
  
  // Load generation state
  const [loadGenerating, setLoadGenerating] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectDelayRef = useRef<number>(1000);

  useEffect(() => {
    setIsMounted(true);
    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const connectSSE = () => {
    setStatus('connecting');
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const sseUrl = `${apiBaseUrl}/analytics/live`;

    console.log(`Connecting to SSE stream at: ${sseUrl}`);
    const es = new EventSource(sseUrl, { withCredentials: true });
    eventSourceRef.current = es;

    es.onopen = () => {
      setStatus('connected');
      reconnectDelayRef.current = 1000; // Reset exponential backoff
    };

    es.onmessage = (event) => {
      try {
        const metrics = JSON.parse(event.data);
        if (metrics.keepAlive) return;

        setTotalEvents(metrics.totalEvents);
        setEventsPerSec(metrics.eventsPerSec);
        setP50Latency(metrics.p50Latency);
        setP95Latency(metrics.p95Latency);

        // Add tick to chart data (keep last 25 elements)
        const timeString = new Date(metrics.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        setChartData((prev) => {
          const nextData = [...prev, { time: timeString, eventsPerSec: metrics.eventsPerSec }];
          if (nextData.length > 25) {
            nextData.shift();
          }
          return nextData;
        });
      } catch (err) {
        console.error('Failed to parse live telemetry message:', err);
      }
    };

    es.onerror = () => {
      setStatus('disconnected');
      es.close();

      // Exponential backoff reconnect
      const retryMs = reconnectDelayRef.current;
      console.warn(`SSE connection closed. Reconnecting in ${retryMs}ms...`);
      setTimeout(() => {
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 16000);
        connectSSE();
      }, retryMs);
    };
  };

  const handleGenerateLoad = async () => {
    if (cooldown > 0 || loadGenerating) return;
    setLoadGenerating(true);

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiBaseUrl}/analytics/demo-load`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Pass cookies session auth
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || 'Failed to fire load burst.');
      } else {
        setCooldown(5); // 5 seconds rate limit cooldown
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred generating mock load.');
    } finally {
      setLoadGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        
        {/* Header Summary */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight gradient-text mb-2">Live Metrics Telemetry</h1>
            <p className="text-muted-foreground">Monitor real-time event pipeline status and database aggregation rates</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-card border border-border text-xs">
              <span className={`h-2.5 w-2.5 rounded-full ${
                status === 'connected' ? 'bg-green-500 animate-pulse' :
                status === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-destructive'
              }`}></span>
              <span className="capitalize font-medium text-muted-foreground">
                {status === 'connected' ? 'Streaming Live' : status === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </span>
            </div>

            {/* Generate Load Button */}
            <button
              onClick={handleGenerateLoad}
              disabled={loadGenerating || cooldown > 0}
              className="flex items-center space-x-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg hover:shadow-primary/20 transition disabled:opacity-50"
            >
              <Zap className="h-4 w-4" />
              <span>{cooldown > 0 ? `Cooldown (${cooldown}s)` : 'Generate Mock Load'}</span>
            </button>
          </div>
        </div>

        {/* Live Counters Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          <div className="p-6 rounded-2xl glass-card relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-primary/10 text-primary rounded-xl">
                <Database className="h-6 w-6" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-foreground">{totalEvents.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">Total Processed Events (Database)</div>
          </div>

          <div className="p-6 rounded-2xl glass-card relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
                <Activity className="h-6 w-6" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-foreground">{eventsPerSec.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">Average Events / Second</div>
          </div>

          <div className="p-6 rounded-2xl glass-card relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
                <Clock className="h-6 w-6" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-foreground">{p50Latency.toFixed(0)} ms</div>
            <div className="text-xs text-muted-foreground mt-1">P50 Telemetry Latency</div>
          </div>

          <div className="p-6 rounded-2xl glass-card relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                <Clock className="h-6 w-6" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-foreground">{p95Latency.toFixed(0)} ms</div>
            <div className="text-xs text-muted-foreground mt-1">P95 Telemetry Latency</div>
          </div>
          
        </div>

        {/* Live Line Chart */}
        <div className="p-6 md:p-8 rounded-2xl glass-panel border border-border">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Live Telemetry Rate</h2>
              <p className="text-xs text-muted-foreground">Line graph demonstrating the flow rate of events parsed from streams</p>
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Real-time graph feed</span>
            </div>
          </div>

          <div className="h-80 w-full">
            {isMounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="time" 
                    stroke="rgba(255,255,255,0.4)" 
                    fontSize={11} 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.4)" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="eventsPerSec" 
                    name="Events/Sec"
                    stroke="#38bdf8" 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center border border-dashed border-border rounded-xl">
                <span className="text-muted-foreground text-sm">Awaiting pipeline telemetry data... Fire a mock load burst to kickstart the stream.</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

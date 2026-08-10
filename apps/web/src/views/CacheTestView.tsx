import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Button, StatusBadge } from '@repo/ui';
import { CacheTestResponse } from '@repo/types';
import { Zap, Send, ArrowRight, Server } from 'lucide-react';

export const CacheTestView: React.FC = () => {
  const [key, setKey] = useState('demo-key');
  const [val, setVal] = useState('Turborepo + TanStack + NestJS');
  const [activeParams, setActiveParams] = useState({ key: 'demo-key', val: 'Turborepo + TanStack + NestJS' });

  const { data, isLoading, isFetching, refetch } = useQuery<CacheTestResponse>({
    queryKey: ['cache-test', activeParams],
    queryFn: async () => {
      const url = `/api/cache-test?key=${encodeURIComponent(activeParams.key)}&val=${encodeURIComponent(activeParams.val)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Cache request failed');
      return res.json();
    },
  });

  const handleTest = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveParams({ key, val });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
          Upstash Redis Integration Test
        </h2>
        <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>
          Test REST-based Redis cache reads and writes executed by the NestJS backend.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Test Form */}
        <Card title="Cache Set / Get Tester" icon={<Zap />}>
          <form onSubmit={handleTest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '6px' }}>
                Cache Key
              </label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '6px' }}>
                Value Payload
              </label>
              <input
                type="text"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  outline: 'none',
                }}
              />
            </div>
            <Button type="submit" variant="primary" isLoading={isFetching}>
              <Send size={16} />
              Execute Redis Set & Read
            </Button>
          </form>
        </Card>

        {/* Response Inspector */}
        <Card title="NestJS Cache Response" icon={<Server />}>
          {isLoading ? (
            <p style={{ color: '#9ca3af' }}>Fetching cache status...</p>
          ) : data ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Storage Provider:</span>
                <StatusBadge
                  status={data.source === 'upstash-redis' ? 'connected' : 'configured'}
                  label={data.source}
                />
              </div>
              <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem' }}>
                <div style={{ color: '#818cf8', fontWeight: 600, marginBottom: '4px' }}>Key: {data.key}</div>
                <div style={{ color: '#4ade80' }}>Value: {data.value}</div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Executed at: {new Date(data.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ) : (
            <p style={{ color: '#ef4444' }}>Error connecting to NestJS API</p>
          )}
        </Card>
      </div>
    </div>
  );
};

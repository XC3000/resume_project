import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, StatusBadge, Button } from '@repo/ui';
import { Database, UserCheck, ShieldAlert, RefreshCw } from 'lucide-react';

interface UsersResponse {
  source: string;
  users: Array<{ id: string; name?: string; email: string; createdAt: string }>;
  message?: string;
  error?: string;
}

export const UsersView: React.FC = () => {
  const { data, isLoading, refetch, isFetching } = useQuery<UsersResponse>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
            Supabase PostgreSQL Integration
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>
            User data queried via NestJS Prisma ORM service connected to Supabase.
          </p>
        </div>
        <Button variant="secondary" onClick={() => refetch()} isLoading={isFetching}>
          <RefreshCw size={16} />
          Reload Data
        </Button>
      </div>

      <Card
        title="Supabase Users Query"
        icon={<Database />}
        extra={
          data?.source === 'supabase-postgresql' ? (
            <StatusBadge status="connected" label="Supabase Active" />
          ) : (
            <StatusBadge status="configured" label={data?.source || 'Demo Mode'} />
          )
        }
      >
        {isLoading ? (
          <p style={{ color: '#9ca3af' }}>Querying database...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {data?.message && (
              <div
                style={{
                  background: 'rgba(234, 179, 8, 0.1)',
                  border: '1px solid rgba(234, 179, 8, 0.25)',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  color: '#facc15',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <ShieldAlert size={18} />
                <span>{data.message}</span>
              </div>
            )}

            {/* Users Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', color: '#d1d5db' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'left' }}>
                    <th style={{ padding: '12px', color: '#9ca3af' }}>User ID</th>
                    <th style={{ padding: '12px', color: '#9ca3af' }}>Name</th>
                    <th style={{ padding: '12px', color: '#9ca3af' }}>Email</th>
                    <th style={{ padding: '12px', color: '#9ca3af' }}>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.users && data.users.length > 0 ? (
                    data.users.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '0.8rem', color: '#818cf8' }}>
                          {u.id}
                        </td>
                        <td style={{ padding: '12px', fontWeight: 600, color: '#f3f4f6' }}>{u.name || 'N/A'}</td>
                        <td style={{ padding: '12px' }}>{u.email}</td>
                        <td style={{ padding: '12px', fontSize: '0.8rem', color: '#9ca3af' }}>
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                        No user records found in database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

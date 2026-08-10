export interface ServiceStatus {
  status: 'connected' | 'disconnected' | 'configured' | 'unconfigured' | 'error';
  message: string;
  timestamp: string;
  latencyMs?: number;
}

export interface HealthCheckResponse {
  server: {
    status: 'ok';
    uptimeSeconds: number;
    environment: string;
  };
  supabaseDatabase: ServiceStatus;
  upstashRedis: ServiceStatus;
}

export interface UserDto {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface CacheTestResponse {
  key: string;
  value: string;
  source: 'upstash-redis' | 'memory-fallback';
  timestamp: string;
}

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

export interface CacheTestResponse {
  key: string;
  value: string;
  source: 'upstash-redis' | 'memory-fallback';
  timestamp: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username: string;
  avatar: string;
  provider: 'github' | 'email';
  bio?: string;
  location?: string;
  publicRepos?: number;
  createdAt: string;
}

export interface RegisterRequest {
  name?: string;
  email: string;
  password?: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface GithubAuthRequest {
  code?: string;
}

export interface GithubUrlResponse {
  url: string;
  clientId: string;
  callbackUrl: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface LogoutResponse {
  success: boolean;
}

export interface UsersResponse {
  source: string;
  message?: string;
  error?: string;
  users: Array<{
    id: string;
    name?: string;
    email: string;
    createdAt: string;
  }>;
}

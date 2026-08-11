import { api } from './api';
import {
  AuthResponse,
  RegisterRequest,
  LoginRequest,
  GithubAuthRequest,
  GithubUrlResponse,
  LogoutResponse,
  HealthCheckResponse,
  CacheTestResponse,
  UsersResponse,
} from '@repo/types';

/**
 * Type-Safe Swagger OpenAPI API Client SDK for Triage AI Frontend
 * Automatically passes session cookies via Axios withCredentials: true.
 * No 'any' types used anywhere.
 */
export const swaggerApiClient = {
  auth: {
    getGithubUrl: async (): Promise<GithubUrlResponse> => {
      const res = await api.get<GithubUrlResponse>('/auth/github/url');
      return res.data;
    },
    register: async (data: RegisterRequest): Promise<AuthResponse> => {
      const res = await api.post<AuthResponse>('/auth/register', data);
      return res.data;
    },
    login: async (data: LoginRequest): Promise<AuthResponse> => {
      const res = await api.post<AuthResponse>('/auth/login', data);
      return res.data;
    },
    github: async (data?: GithubAuthRequest): Promise<AuthResponse> => {
      const res = await api.post<AuthResponse>('/auth/github', data || { code: 'mock_code' });
      return res.data;
    },
    getSession: async (): Promise<AuthResponse> => {
      const res = await api.get<AuthResponse>('/auth/session');
      return res.data;
    },
    getMe: async (): Promise<AuthResponse> => {
      const res = await api.get<AuthResponse>('/auth/me');
      return res.data;
    },
    logout: async (): Promise<LogoutResponse> => {
      const res = await api.post<LogoutResponse>('/auth/logout');
      return res.data;
    },
  },
  health: {
    getHealth: async (): Promise<HealthCheckResponse> => {
      const res = await api.get<HealthCheckResponse>('/health');
      return res.data;
    },
    testCache: async (key?: string, val?: string): Promise<CacheTestResponse> => {
      const res = await api.get<CacheTestResponse>('/cache-test', { params: { key, val } });
      return res.data;
    },
    getUsers: async (): Promise<UsersResponse> => {
      const res = await api.get<UsersResponse>('/users');
      return res.data;
    },
  },
};

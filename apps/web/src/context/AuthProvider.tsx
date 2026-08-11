import React, { useState, useEffect } from 'react';
import { User } from './AuthTypes';
import { AuthContext } from './useAuth';
import { swaggerApiClient } from '../lib/swagger-client';
import axios from 'axios';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch current session from backend using Swagger API Client
  const fetchSession = async () => {
    setIsLoading(true);
    try {
      const data = await swaggerApiClient.auth.getSession();
      setUser(data.user);
      setToken(data.token);
    } catch {
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const signIn = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const data = await swaggerApiClient.auth.login({ email, password: pass });
      setUser(data.user);
      setToken(data.token);
      setIsLoading(false);
      return { success: true };
    } catch (err) {
      setIsLoading(false);
      let message = 'Account not found. Please sign up first.';
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        message = String(err.response.data.message);
      }
      return { success: false, error: message };
    }
  };

  const signUp = async (name: string, email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const data = await swaggerApiClient.auth.register({ name, email, password: pass });
      setUser(data.user);
      setToken(data.token);
      setIsLoading(false);
      return { success: true };
    } catch (err) {
      setIsLoading(false);
      let message = 'Registration failed.';
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        message = String(err.response.data.message);
      }
      return { success: false, error: message };
    }
  };

  const signInWithGithub = async (): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const data = await swaggerApiClient.auth.github({ code: 'mock_code' });
      setUser(data.user);
      setToken(data.token);
      setIsLoading(false);
      return { success: true };
    } catch (err) {
      setIsLoading(false);
      let message = 'GitHub auth failed.';
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        message = String(err.response.data.message);
      }
      return { success: false, error: message };
    }
  };

  const signOut = async () => {
    try {
      await swaggerApiClient.auth.logout();
    } catch {
      // ignore network error on logout
    } finally {
      setUser(null);
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, signIn, signUp, signInWithGithub, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

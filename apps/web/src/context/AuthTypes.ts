import { AuthUser } from '@repo/types';

export type User = AuthUser;

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (name: string, email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGithub: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

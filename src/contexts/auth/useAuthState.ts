
import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from './types';

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const authErrorHandledRef = useRef(false);

  const setupTokenRefresh = (session: Session) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    if (session.expires_at) {
      const refreshTime = (session.expires_at * 1000) - Date.now() - 60000;
      if (refreshTime > 0) {
        refreshTimeoutRef.current = setTimeout(async () => {
          try {
            const { data, error } = await supabase.auth.refreshSession();
            if (error) throw error;
            if (data.session) {
              setSession(data.session);
              setupTokenRefresh(data.session);
            }
          } catch (error) {
            console.error('Token refresh failed:', error);
            logout();
          }
        }, refreshTime);
      }
    }
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  };

  const register = async (email: string, password: string, userData?: any) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData || {},
      },
    });

    if (error) {
      throw error;
    }
  };

  const logout = async () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout error:", error);
    } else {
      setUser(null);
      setSession(null);
    }
  };

  return {
    user,
    setUser,
    session,
    setSession,
    isLoading,
    setIsLoading,
    refreshTimeoutRef,
    authErrorHandledRef,
    setupTokenRefresh,
    login,
    register,
    logout
  };
}

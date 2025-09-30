/**
 * Auth Session Context - Phase 1 Optimization
 * Caches authenticated user to eliminate runtime auth queries during transactions
 * Reduces 100-900ms auth retry overhead per transaction
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuthSessionContextType {
  userId: string | null;
  isLoading: boolean;
  error: string | null;
  refreshSession: () => Promise<void>;
}

const AuthSessionContext = createContext<AuthSessionContextType | undefined>(undefined);

export const AuthSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ AUTH SESSION: Failed to get user:', authError);
        setError(authError.message);
        setUserId(null);
      } else if (user) {
        console.log('✅ AUTH SESSION: User cached:', user.id);
        setUserId(user.id);
      } else {
        console.warn('⚠️ AUTH SESSION: No user session');
        setUserId(null);
      }
    } catch (err) {
      console.error('❌ AUTH SESSION: Exception:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setUserId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial session load
    refreshSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔄 AUTH SESSION: State changed:', _event);
      if (session?.user) {
        setUserId(session.user.id);
        setError(null);
      } else {
        setUserId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshSession]);

  return (
    <AuthSessionContext.Provider value={{ userId, isLoading, error, refreshSession }}>
      {children}
    </AuthSessionContext.Provider>
  );
};

export const useAuthSession = () => {
  const context = useContext(AuthSessionContext);
  if (context === undefined) {
    throw new Error('useAuthSession must be used within AuthSessionProvider');
  }
  return context;
};

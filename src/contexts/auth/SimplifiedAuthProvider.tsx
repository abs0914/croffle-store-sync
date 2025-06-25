
import React, { createContext, useContext, ReactNode, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session, AuthState } from "./types";
import { checkPermission, checkStoreAccess } from "./utils";
import { authDebugger } from "@/utils/authDebug";
import { UserRole } from "@/types";

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  hasPermission: () => false,
  hasStoreAccess: () => false,
};

const AuthContext = createContext<AuthState>(initialState);

export function SimplifiedAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authInitializedRef = useRef(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear loading timeout
  const clearLoadingTimeout = () => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };

  // Force clear loading state after 1 second (reduced from 3s)
  const setLoadingTimeout = () => {
    clearLoadingTimeout();
    loadingTimeoutRef.current = setTimeout(() => {
      authDebugger.log('Loading timeout reached, forcing loading state to clear', {}, 'warning');
      setIsLoading(false);
    }, 1000); // Reduced timeout to 1 second
  };

  // Cache session in localStorage
  const cacheSession = (session: Session | null) => {
    try {
      if (session) {
        localStorage.setItem('cached_session', JSON.stringify({
          user: session.user,
          access_token: session.access_token,
          expires_at: session.expires_at,
          cached_at: Date.now()
        }));
      } else {
        localStorage.removeItem('cached_session');
      }
    } catch (error) {
      authDebugger.log('Failed to cache session', { error }, 'warning');
    }
  };

  // Get cached session
  const getCachedSession = () => {
    try {
      const cached = localStorage.getItem('cached_session');
      if (cached) {
        const parsedCache = JSON.parse(cached);
        // Check if cache is less than 5 minutes old
        if (Date.now() - parsedCache.cached_at < 5 * 60 * 1000) {
          return parsedCache;
        }
      }
    } catch (error) {
      authDebugger.log('Failed to get cached session', { error }, 'warning');
    }
    return null;
  };

  // Simplified login with better error handling
  const login = async (email: string, password: string) => {
    authDebugger.log('Login attempt started', { email });
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        authDebugger.log('Login failed', { error: error.message, email }, 'error');
        throw error;
      }
      
      authDebugger.log('Login successful', { email });
    } catch (error) {
      authDebugger.log('Login error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        email 
      }, 'error');
      throw error;
    }
  };

  const register = async (email: string, password: string, userData?: any) => {
    authDebugger.log('Registration attempt started', { email });
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData || {},
      },
    });

    if (error) {
      authDebugger.log('Registration failed', { error: error.message, email }, 'error');
      throw error;
    }

    authDebugger.log('Registration successful', { email });
  };

  const logout = async () => {
    authDebugger.log('Logout initiated');
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        authDebugger.log('Logout error', { error: error.message }, 'error');
      } else {
        authDebugger.log('Logout successful');
        setUser(null);
        setSession(null);
        cacheSession(null);
      }
    } catch (error) {
      authDebugger.log('Logout failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'error');
      // Force clear state even if logout fails
      setUser(null);
      setSession(null);
      cacheSession(null);
    }
  };

  // Create user from session data only (no database calls)
  const createUserFromSession = (supabaseUser: any): User => {
    authDebugger.log('Creating user from session data only', { userId: supabaseUser.id });
    
    const email = supabaseUser.email || 'unknown@example.com';
    const firstName = supabaseUser.user_metadata?.first_name || email.split('@')[0];
    const lastName = supabaseUser.user_metadata?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || email.split('@')[0] || 'User';

    return {
      id: supabaseUser.id,
      email,
      firstName,
      lastName,
      name: fullName,
      role: (supabaseUser.user_metadata?.role as UserRole) || 'staff',
      storeIds: supabaseUser.user_metadata?.store_ids || [],
      isActive: true,
      createdAt: supabaseUser.created_at || new Date().toISOString(),
      updatedAt: supabaseUser.updated_at || new Date().toISOString(),
    };
  };

  // Simplified auth initialization
  useEffect(() => {
    if (authInitializedRef.current) return;
    authInitializedRef.current = true;

    authDebugger.log('Initializing authentication system');
    
    // Try to use cached session first for immediate UI update
    const cachedSession = getCachedSession();
    if (cachedSession) {
      authDebugger.log('Using cached session for immediate load', { userId: cachedSession.user.id });
      const user = createUserFromSession(cachedSession.user);
      setUser(user);
      setSession(cachedSession);
      setIsLoading(false);
    } else {
      setLoadingTimeout(); // Start loading timeout protection only if no cache
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        authDebugger.log('Auth state change event', { 
          event, 
          hasSession: !!newSession,
          userId: newSession?.user?.id 
        });
        
        clearLoadingTimeout(); // Clear timeout since we got an event
        
        try {
          setSession(newSession);
          cacheSession(newSession);
          
          if (newSession?.user) {
            // Use session data only - no database calls
            const mappedUser = createUserFromSession(newSession.user);
            setUser(mappedUser);
            authDebugger.log('User authenticated from session', { 
              userId: mappedUser.id,
              email: mappedUser.email,
              role: mappedUser.role 
            });
          } else {
            setUser(null);
            authDebugger.log('User not authenticated');
          }
        } catch (error) {
          authDebugger.log('Error in auth state change handler', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }, 'error');
          setUser(null);
          setSession(null);
          cacheSession(null);
        } finally {
          setIsLoading(false);
        }
      }
    );

    // Check for existing session with 1 second timeout
    const checkInitialSession = async () => {
      try {
        authDebugger.log('Checking for existing session');
        
        // Add 1 second timeout to session check
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 1000)
        );

        const { data: { session: currentSession }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;
        
        if (error) {
          authDebugger.log('Session check error', { error: error.message }, 'error');
          setIsLoading(false);
          clearLoadingTimeout();
          return;
        }
        
        if (currentSession?.user) {
          authDebugger.log('Existing session found', { 
            userId: currentSession.user.id,
            email: currentSession.user.email 
          });
          // The auth state change handler will process this
        } else {
          authDebugger.log('No existing session found');
          setIsLoading(false);
          clearLoadingTimeout();
        }
      } catch (error) {
        authDebugger.log('Session check failed or timed out', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }, 'error');
        setIsLoading(false);
        clearLoadingTimeout();
      }
    };

    // Only check session if we don't have a cached one
    if (!cachedSession) {
      checkInitialSession();
    }

    return () => {
      subscription.unsubscribe();
      clearLoadingTimeout();
    };
  }, []);

  const hasPermission = (requiredRole: UserRole): boolean => {
    if (!user) return false;
    return checkPermission(user.role, requiredRole);
  };

  const hasStoreAccess = (storeId: string): boolean => {
    if (!user) return false;
    return checkStoreAccess(user.storeIds, storeId, user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        hasPermission,
        hasStoreAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

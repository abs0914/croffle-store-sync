
import React, { createContext, useContext, ReactNode, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session, AuthState } from "./types";
import { checkPermission, checkStoreAccess } from "./utils";
import { authDebugger } from "@/utils/authDebug";
import { UserRole } from "@/types";
import { trackAuth, endMetric } from "@/utils/performanceMonitor";
import { handleSpecialCases } from "./special-cases-utils";

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
  const lastProcessedEventRef = useRef<string | null>(null);

  // Add detailed logging for loading state changes
  const setLoadingWithLog = (loading: boolean, reason: string) => {
    console.log(`🔐 Auth Loading State: ${loading} - Reason: ${reason}`);
    authDebugger.log(`Loading state changed to ${loading}`, { reason });
    setIsLoading(loading);
  };

  // Clear loading timeout
  const clearLoadingTimeout = () => {
    if (loadingTimeoutRef.current) {
      console.log('🔐 Clearing loading timeout');
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };

  // Force clear loading state after 5 seconds (increased from 1 second)
  const setLoadingTimeout = () => {
    clearLoadingTimeout();
    console.log('🔐 Setting loading timeout (5 seconds)');
    loadingTimeoutRef.current = setTimeout(() => {
      console.log('🔐 Loading timeout reached, forcing loading state to clear');
      authDebugger.log('Loading timeout reached, forcing loading state to clear', {}, 'warning');
      setLoadingWithLog(false, 'timeout reached');
    }, 5000);
  };

  // Cache session in localStorage
  const cacheSession = (session: Session | null) => {
    try {
      if (session) {
        const cacheData = {
          user: session.user,
          access_token: session.access_token,
          expires_at: session.expires_at,
          cached_at: Date.now()
        };
        localStorage.setItem('cached_session', JSON.stringify(cacheData));
        console.log('🔐 Session cached successfully');
      } else {
        localStorage.removeItem('cached_session');
        console.log('🔐 Session cache cleared');
      }
    } catch (error) {
      console.error('🔐 Failed to cache session:', error);
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
          console.log('🔐 Using cached session');
          return parsedCache;
        } else {
          console.log('🔐 Cached session expired');
        }
      }
    } catch (error) {
      console.error('🔐 Failed to get cached session:', error);
      authDebugger.log('Failed to get cached session', { error }, 'warning');
    }
    return null;
  };

  // Simplified login with better error handling
  const login = async (email: string, password: string) => {
    trackAuth('login');
    console.log('🔐 Login attempt started', { email });
    authDebugger.log('Login attempt started', { email });
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('🔐 Login failed:', error.message);
        authDebugger.log('Login failed', { error: error.message, email }, 'error');
        endMetric('auth_login', { success: false, error: error.message });
        throw error;
      }

      console.log('🔐 Login successful', { email });
      authDebugger.log('Login successful', { email });
      endMetric('auth_login', { success: true, email });
    } catch (error) {
      console.error('🔐 Login error:', error);
      authDebugger.log('Login error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email
      }, 'error');
      endMetric('auth_login', { success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  };

  const register = async (email: string, password: string, userData?: any) => {
    console.log('🔐 Registration attempt started', { email });
    authDebugger.log('Registration attempt started', { email });
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData || {},
      },
    });

    if (error) {
      console.error('🔐 Registration failed:', error.message);
      authDebugger.log('Registration failed', { error: error.message, email }, 'error');
      throw error;
    }

    console.log('🔐 Registration successful', { email });
    authDebugger.log('Registration successful', { email });
  };

  const logout = async () => {
    console.log('🔐 Logout initiated');
    authDebugger.log('Logout initiated');
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('🔐 Logout error:', error.message);
        authDebugger.log('Logout error', { error: error.message }, 'error');
      } else {
        console.log('🔐 Logout successful');
        authDebugger.log('Logout successful');
        setUser(null);
        setSession(null);
        cacheSession(null);
      }
    } catch (error) {
      console.error('🔐 Logout failed:', error);
      authDebugger.log('Logout failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'error');
      // Force clear state even if logout fails
      setUser(null);
      setSession(null);
      cacheSession(null);
    }
  };

  // Create user from session data with special case handling
  const createUserFromSession = async (supabaseUser: any): Promise<User> => {
    console.log('🔐 Creating user from session data with special cases', { userId: supabaseUser.id });
    authDebugger.log('Creating user from session data with special cases', { userId: supabaseUser.id });

    const email = supabaseUser.email || 'unknown@example.com';
    const firstName = supabaseUser.user_metadata?.first_name || email.split('@')[0];
    const lastName = supabaseUser.user_metadata?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || email.split('@')[0] || 'User';

    // Handle special cases (like admin@example.com)
    const specialCase = await handleSpecialCases(supabaseUser.user_metadata, email, 'staff');

    console.log('🔐 Special case handling result', {
      email,
      role: specialCase.role,
      storeIds: specialCase.storeIds
    });

    return {
      id: supabaseUser.id,
      email,
      firstName,
      lastName,
      name: fullName,
      role: specialCase.role,
      storeIds: specialCase.storeIds,
      isActive: true,
      createdAt: supabaseUser.created_at || new Date().toISOString(),
      updatedAt: supabaseUser.updated_at || new Date().toISOString(),
    };
  };

  // Simplified auth initialization
  useEffect(() => {
    if (authInitializedRef.current) {
      console.log('🔐 Auth already initialized, skipping');
      return;
    }
    authInitializedRef.current = true;

    console.log('🔐 Initializing authentication system');
    authDebugger.log('Initializing authentication system');
    
    // Try to use cached session first for immediate UI update
    const cachedSession = getCachedSession();
    if (cachedSession) {
      console.log('🔐 Using cached session for immediate load', { userId: cachedSession.user.id });
      authDebugger.log('Using cached session for immediate load', { userId: cachedSession.user.id });

      // Handle async user creation
      createUserFromSession(cachedSession.user).then(user => {
        setUser(user);
        setSession(cachedSession);
        setLoadingWithLog(false, 'cached session loaded');
      }).catch(error => {
        console.error('🔐 Error creating user from cached session:', error);
        setLoadingTimeout(); // Fallback to timeout protection
      });
    } else {
      console.log('🔐 No cached session, starting loading timeout');
      setLoadingTimeout(); // Start loading timeout protection only if no cache
    }

    // Set up auth state listener
    console.log('🔐 Setting up auth state listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        const eventKey = `${event}_${newSession?.user?.id || 'null'}`;

        // Skip duplicate events within short timeframe
        if (lastProcessedEventRef.current === eventKey) {
          console.log('🔐 Skipping duplicate auth event', { event });
          return;
        }
        lastProcessedEventRef.current = eventKey;

        console.log('🔐 Auth state change event', {
          event,
          hasSession: !!newSession,
          userId: newSession?.user?.id
        });
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
            // Use session data with special case handling
            createUserFromSession(newSession.user).then(mappedUser => {
              setUser(mappedUser);
              console.log('🔐 User authenticated from session', {
                userId: mappedUser.id,
                email: mappedUser.email,
                role: mappedUser.role
              });
              authDebugger.log('User authenticated from session', {
                userId: mappedUser.id,
                email: mappedUser.email,
                role: mappedUser.role
              });
            }).catch(error => {
              console.error('🔐 Error creating user from session:', error);
              setUser(null);
            });
          } else {
            setUser(null);
            console.log('🔐 User not authenticated');
            authDebugger.log('User not authenticated');
          }
        } catch (error) {
          console.error('🔐 Error in auth state change handler:', error);
          authDebugger.log('Error in auth state change handler', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }, 'error');
          setUser(null);
          setSession(null);
          cacheSession(null);
        } finally {
          setLoadingWithLog(false, 'auth state change processed');
        }
      }
    );

    // Check for existing session with 1 second timeout
    const checkInitialSession = async () => {
      try {
        console.log('🔐 Checking for existing session');
        authDebugger.log('Checking for existing session');
        
        // Add 10 second timeout to session check (increased from 1 second)
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session check timeout')), 10000)
        );

        const { data: { session: currentSession }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;
        
        if (error) {
          console.error('🔐 Session check error:', error.message);
          authDebugger.log('Session check error', { error: error.message }, 'error');
          setLoadingWithLog(false, 'session check error');
          clearLoadingTimeout();
          return;
        }
        
        if (currentSession?.user) {
          console.log('🔐 Existing session found', { 
            userId: currentSession.user.id,
            email: currentSession.user.email 
          });
          authDebugger.log('Existing session found', { 
            userId: currentSession.user.id,
            email: currentSession.user.email 
          });
          // The auth state change handler will process this
        } else {
          console.log('🔐 No existing session found');
          authDebugger.log('No existing session found');
          setLoadingWithLog(false, 'no existing session');
          clearLoadingTimeout();
        }
      } catch (error) {
        console.error('🔐 Session check failed or timed out:', error);
        authDebugger.log('Session check failed or timed out', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }, 'error');
        setLoadingWithLog(false, 'session check timeout');
        clearLoadingTimeout();
      }
    };

    // Only check session if we don't have a cached one
    if (!cachedSession) {
      console.log('🔐 No cached session, checking for existing session');
      checkInitialSession();
    }

    return () => {
      console.log('🔐 Cleaning up auth provider');
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

  console.log('🔐 Auth Provider Render:', { 
    isLoading, 
    isAuthenticated: !!user, 
    hasUser: !!user,
    hasSession: !!session 
  });

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

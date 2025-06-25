import React, { createContext, useContext, ReactNode, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session, AuthState } from "./types";
import { checkPermission, checkStoreAccess } from "./utils";
import { enhancedMapSupabaseUser } from "./enhancedUserMapping";
import { authDebugger, withTimeout } from "@/utils/authDebug";
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
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const authInitializedRef = useRef(false);
  const sessionCheckAttempts = useRef(0);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced login with better error handling
  const login = async (email: string, password: string) => {
    authDebugger.log('Login attempt started', { email });
    try {
      // Clear any existing session first
      await supabase.auth.signOut();
      
      const loginPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      const { error } = await withTimeout(
        loginPromise,
        15000, // 15 second timeout for login
        'Login request timed out'
      );

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
    
    const registerPromise = supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData || {},
      },
    });

    const { error } = await withTimeout(
      registerPromise,
      15000, // 15 second timeout
      'Registration request timed out'
    );

    if (error) {
      authDebugger.log('Registration failed', { error: error.message, email }, 'error');
      throw error;
    }

    authDebugger.log('Registration successful', { email });
  };

  const logout = async () => {
    authDebugger.log('Logout initiated');
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    try {
      const { error } = await withTimeout(
        supabase.auth.signOut(),
        10000, // 10 second timeout
        'Logout request timed out'
      );
      
      if (error) {
        authDebugger.log('Logout error', { error: error.message }, 'error');
      } else {
        authDebugger.log('Logout successful');
        setUser(null);
        setSession(null);
      }
    } catch (error) {
      authDebugger.log('Logout failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'error');
      // Force clear state even if logout fails
      setUser(null);
      setSession(null);
    }
  };

  const setupTokenRefresh = (session: Session) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    if (session.expires_at) {
      const refreshTime = (session.expires_at * 1000) - Date.now() - 60000;
      authDebugger.log('Setting up token refresh', { refreshTimeSeconds: Math.round(refreshTime / 1000) });
      
      if (refreshTime > 0) {
        refreshTimeoutRef.current = setTimeout(async () => {
          authDebugger.log('Attempting token refresh');
          try {
            const { data, error } = await supabase.auth.refreshSession();
            if (error) {
              authDebugger.log('Token refresh error', { error: error.message }, 'error');
              const { data: currentSession } = await supabase.auth.getSession();
              if (!currentSession.session) {
                authDebugger.log('No valid session after refresh failure, logging out');
                await logout();
              }
              return;
            }
            
            if (data.session) {
              authDebugger.log('Token refresh successful');
              setSession(data.session);
              setupTokenRefresh(data.session);
            }
          } catch (error) {
            authDebugger.log('Token refresh failed', { 
              error: error instanceof Error ? error.message : 'Unknown error' 
            }, 'error');
            await logout();
          }
        }, refreshTime);
      }
    }
  };

  // Enhanced auth initialization with comprehensive timeout protection
  useEffect(() => {
    if (authInitializedRef.current) return;
    authInitializedRef.current = true;

    authDebugger.log('Initializing authentication system');
    
    // Set comprehensive loading timeout
    loadingTimeoutRef.current = setTimeout(() => {
      authDebugger.log('Authentication initialization timeout reached', {}, 'warning');
      if (sessionCheckAttempts.current < 3) {
        authDebugger.log('Retrying authentication initialization', { 
          attempt: sessionCheckAttempts.current + 1 
        });
        sessionCheckAttempts.current++;
        authInitializedRef.current = false;
        setTimeout(() => {
          if (!authInitializedRef.current) {
            authInitializedRef.current = true;
            checkInitialSession();
          }
        }, 2000);
      } else {
        authDebugger.log('Max retry attempts reached, stopping loading', {}, 'error');
        setIsLoading(false);
      }
    }, 8000); // Increased timeout to 8 seconds

    // Enhanced auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        authDebugger.log('Auth state change event', { 
          event, 
          hasSession: !!newSession,
          userId: newSession?.user?.id 
        });
        
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
        
        try {
          setSession(newSession);
          
          if (newSession?.user) {
            // Use setTimeout to prevent blocking the auth state change
            setTimeout(async () => {
              try {
                const mappedUser = await enhancedMapSupabaseUser(newSession.user);
                setUser(mappedUser);
                setupTokenRefresh(newSession);
                authDebugger.log('User authenticated and mapped', { 
                  userId: mappedUser.id,
                  email: mappedUser.email,
                  role: mappedUser.role 
                });
              } catch (error) {
                authDebugger.log('Error mapping user during auth state change', { 
                  error: error instanceof Error ? error.message : 'Unknown error' 
                }, 'error');
                setUser(null);
                setSession(null);
              }
              setIsLoading(false);
            }, 0);
          } else {
            setUser(null);
            authDebugger.log('User not authenticated');
            setIsLoading(false);
          }
        } catch (error) {
          authDebugger.log('Error in auth state change handler', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }, 'error');
          setUser(null);
          setSession(null);
          setIsLoading(false);
        }
      }
    );

    // Enhanced session check with comprehensive error handling
    const checkInitialSession = async () => {
      authDebugger.log('Checking for existing session');
      try {
        const sessionPromise = supabase.auth.getSession();
        const { data: { session: currentSession }, error } = await withTimeout(
          sessionPromise,
          10000, // 10 second timeout
          'Session check timed out'
        );
        
        if (error) {
          authDebugger.log('Session check error', { error: error.message }, 'error');
          
          // Handle specific refresh token errors
          if (error.message.includes('refresh_token_not_found') || 
              error.message.includes('Invalid Refresh Token')) {
            authDebugger.log('Invalid refresh token, clearing local storage');
            localStorage.removeItem('supabase.auth.token');
            setSession(null);
            setUser(null);
          }
          setIsLoading(false);
          return;
        }
        
        if (currentSession?.user) {
          authDebugger.log('Existing session found', { 
            userId: currentSession.user.id,
            email: currentSession.user.email 
          });
          try {
            const mappedUser = await enhancedMapSupabaseUser(currentSession.user);
            setSession(currentSession);
            setUser(mappedUser);
            setupTokenRefresh(currentSession);
          } catch (error) {
            authDebugger.log('Error mapping existing user', { 
              error: error instanceof Error ? error.message : 'Unknown error' 
            }, 'error');
            setSession(null);
            setUser(null);
          }
        } else {
          authDebugger.log('No existing session found');
        }
        
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
        setIsLoading(false);
      } catch (error) {
        authDebugger.log('Session check failed', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }, 'error');
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
        setIsLoading(false);
      }
    };

    checkInitialSession();

    return () => {
      subscription.unsubscribe();
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
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

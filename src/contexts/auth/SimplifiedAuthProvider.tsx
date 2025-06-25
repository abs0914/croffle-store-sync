
import React, { createContext, useContext, ReactNode, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session, AuthState } from "./types";
import { checkPermission, checkStoreAccess } from "./utils";
import { enhancedMapSupabaseUser } from "./enhancedUserMapping";
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

  // Force clear loading state after timeout
  const setLoadingTimeout = () => {
    clearLoadingTimeout();
    loadingTimeoutRef.current = setTimeout(() => {
      authDebugger.log('Loading timeout reached, forcing loading state to clear', {}, 'warning');
      setIsLoading(false);
    }, 5000); // 5 second maximum loading time
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

  // Simplified user mapping with timeout protection
  const mapUserSafely = async (supabaseUser: any) => {
    try {
      authDebugger.log('Starting safe user mapping', { userId: supabaseUser.id });
      
      // Set a race condition with timeout
      const mappingPromise = enhancedMapSupabaseUser(supabaseUser);
      const timeoutPromise = new Promise<User>((_, reject) => 
        setTimeout(() => reject(new Error('User mapping timeout')), 3000)
      );

      const mappedUser = await Promise.race([mappingPromise, timeoutPromise]);
      authDebugger.log('User mapping completed successfully', { 
        userId: mappedUser.id,
        role: mappedUser.role 
      });
      return mappedUser;
    } catch (error) {
      authDebugger.log('User mapping failed, using fallback', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: supabaseUser.id 
      }, 'error');
      
      // Create fallback user to prevent loading lock
      return {
        id: supabaseUser.id,
        email: supabaseUser.email || 'unknown@example.com',
        firstName: supabaseUser.user_metadata?.first_name || 'User',
        lastName: supabaseUser.user_metadata?.last_name || '',
        name: supabaseUser.user_metadata?.first_name || supabaseUser.email?.split('@')[0] || 'User',
        role: 'staff' as UserRole,
        storeIds: [],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  };

  // Simplified auth initialization
  useEffect(() => {
    if (authInitializedRef.current) return;
    authInitializedRef.current = true;

    authDebugger.log('Initializing authentication system');
    setLoadingTimeout(); // Start loading timeout protection

    // Set up auth state listener with simplified logic
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
          
          if (newSession?.user) {
            // Use simplified user mapping with timeout protection
            const mappedUser = await mapUserSafely(newSession.user);
            setUser(mappedUser);
            authDebugger.log('User authenticated and mapped', { 
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
        } finally {
          setIsLoading(false);
        }
      }
    );

    // Check for existing session with simplified logic
    const checkInitialSession = async () => {
      try {
        authDebugger.log('Checking for existing session');
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
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
        authDebugger.log('Session check failed', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }, 'error');
        setIsLoading(false);
        clearLoadingTimeout();
      }
    };

    checkInitialSession();

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

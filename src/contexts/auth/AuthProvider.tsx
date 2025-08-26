import React, { createContext, useContext, ReactNode, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session, AuthState } from "./types";
import { useAuthState } from "./useAuthState";
import { checkPermission, checkStoreAccess } from "./utils";
import { mapSupabaseUser } from "./user-mapping-utils";
import { UserRole } from "@/types";

// Helper function to control logging based on environment
const isDevelopment = process.env.NODE_ENV === 'development';
const authLog = (message: string, ...args: any[]) => {
  if (isDevelopment) {
    console.log(`🔐 Auth Provider: ${message}`, ...args);
  }
};

const authError = (message: string, error?: any) => {
  console.error(`🔐 Auth Provider Error: ${message}`, error);
};

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
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
  } = useAuthState();
  
  // Clear any existing timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);
  
  // Setup cross-tab session synchronization through localStorage events
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key?.includes('supabase.auth') && event.newValue !== event.oldValue) {
        authLog('Auth state changed in another tab, synchronizing...');
        
        // Refresh the session state from storage
        supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
          if (currentSession?.user) {
            authLog('Session found in another tab, updating local state');
            const mappedUser = await mapSupabaseUser(currentSession.user);
            setSession(currentSession);
            setUser(mappedUser);
          } else if (session) {
            // User logged out in another tab
            authLog('User logged out in another tab');
            setSession(null);
            setUser(null);
          }
        }).catch(error => {
          authError("Error syncing session across tabs:", error);
        });
      }
    };

    // Add storage event listener for cross-tab synchronization
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [session]);

  // Main auth initialization effect
  useEffect(() => {
    // Reset error handling flag on mount
    authErrorHandledRef.current = false;
    setIsLoading(true);
    
    authLog('Initializing authentication...');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        authLog(`Auth state changed: ${event}`);
        
        // Only update session state synchronously
        setSession(newSession);
        
        if (newSession?.user) {
          // Use setTimeout to avoid recursive auth state changes
          setTimeout(async () => {
            try {
              authLog('🔐 Mapping user in auth state change...');
              const mappedUser = await mapSupabaseUser(newSession.user);
              authLog('🔐 Mapped user result:', mappedUser);
              authLog('🔐 Setting user in auth context...');
              setUser(mappedUser);
              authLog('🔐 User set in auth context successfully. User role:', mappedUser.role);
              setIsLoading(false);
              
              // Setup token refresh for the new session
              setupTokenRefresh(newSession);
            } catch (error) {
              authError('Error mapping user in auth state change:', error);
              setIsLoading(false);
            }
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      if (currentSession?.user) {
        try {
          authLog('Existing session found');
          authLog('🔐 Mapping user from existing session...');
          const mappedUser = await mapSupabaseUser(currentSession.user);
          authLog('🔐 Mapped user from existing session:', mappedUser);
          setSession(currentSession);
          authLog('🔐 Setting user from existing session...');
          setUser(mappedUser);
          authLog('🔐 User set from existing session successfully. Role:', mappedUser.role);
          
          // Setup token refresh
          setupTokenRefresh(currentSession);
        } catch (error) {
          authError("Error mapping user from existing session:", error);
        }
      } else {
        authLog('No existing session found');
      }
      setIsLoading(false);
    }).catch(error => {
      authError("Error checking session:", error);
      setIsLoading(false);
    });

    // Clean up on unmount
    return () => {
      subscription.unsubscribe();
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Handle network status changes
  useEffect(() => {
    const handleOnline = () => {
      authLog('Network connection restored');
      
      // Check if we have a user but need to refresh the session
      if (user && !session) {
        authLog('Attempting to restore session after network reconnection');
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
          if (currentSession) {
            setSession(currentSession);
            setupTokenRefresh(currentSession);
          }
        });
      }
    };
    
    const handleOffline = () => {
      authLog('Network connection lost');
      // We keep the current user/session state when offline
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, session]);

  // Permission and access check functions
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

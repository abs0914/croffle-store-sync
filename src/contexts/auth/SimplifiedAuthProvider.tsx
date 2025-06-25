
import React, { createContext, useContext, ReactNode, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session, AuthState } from "./types";
import { checkPermission, checkStoreAccess, mapSupabaseUser } from "./utils";
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

  // Enhanced login with better error handling
  const login = async (email: string, password: string) => {
    console.log('🔐 Attempting login for:', email);
    try {
      // Clear any existing session first
      await supabase.auth.signOut();
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('🔐 Login error:', error);
        throw error;
      }
      
      console.log('🔐 Login successful');
    } catch (error) {
      console.error('🔐 Login failed:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, userData?: any) => {
    console.log('🔐 Attempting registration for:', email);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData || {},
      },
    });

    if (error) {
      console.error('🔐 Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('🔐 Logging out...');
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("🔐 Logout error:", error);
      } else {
        console.log('🔐 Logout successful');
        setUser(null);
        setSession(null);
      }
    } catch (error) {
      console.error("🔐 Logout failed:", error);
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
      console.log('🔐 Setting up token refresh in:', Math.round(refreshTime / 1000), 'seconds');
      
      if (refreshTime > 0) {
        refreshTimeoutRef.current = setTimeout(async () => {
          console.log('🔐 Attempting token refresh...');
          try {
            const { data, error } = await supabase.auth.refreshSession();
            if (error) {
              console.error('🔐 Token refresh error:', error);
              // If refresh fails, try to get current session
              const { data: currentSession } = await supabase.auth.getSession();
              if (!currentSession.session) {
                console.log('🔐 No valid session after refresh failure, logging out');
                await logout();
              }
              return;
            }
            
            if (data.session) {
              console.log('🔐 Token refresh successful');
              setSession(data.session);
              setupTokenRefresh(data.session);
            }
          } catch (error) {
            console.error("🔐 Token refresh failed:", error);
            // Force logout on refresh failure
            await logout();
          }
        }, refreshTime);
      }
    }
  };

  // Enhanced auth initialization with retry logic
  useEffect(() => {
    if (authInitializedRef.current) return;
    authInitializedRef.current = true;

    console.log('🔐 Initializing simplified authentication...');
    
    // Set loading timeout with retry capability
    const loadingTimeout = setTimeout(() => {
      console.warn('⚠️ Authentication initialization timeout');
      if (sessionCheckAttempts.current < 2) {
        console.log('🔐 Retrying session check...');
        sessionCheckAttempts.current++;
        authInitializedRef.current = false;
        // Retry initialization
        setTimeout(() => {
          if (!authInitializedRef.current) {
            authInitializedRef.current = true;
            checkInitialSession();
          }
        }, 1000);
      } else {
        console.log('🔐 Max retry attempts reached, setting not loading');
        setIsLoading(false);
      }
    }, 5000);

    // Enhanced auth state listener with error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log(`🔐 Auth event: ${event}`, newSession ? 'with session' : 'no session');
        
        clearTimeout(loadingTimeout);
        
        try {
          setSession(newSession);
          
          if (newSession?.user) {
            const mappedUser = await mapSupabaseUser(newSession.user);
            setUser(mappedUser);
            setupTokenRefresh(newSession);
            console.log('🔐 User authenticated:', mappedUser.email);
          } else {
            setUser(null);
            console.log('🔐 User not authenticated');
          }
        } catch (error) {
          console.error('🔐 Error in auth state change:', error);
          setUser(null);
          setSession(null);
        }
        
        setIsLoading(false);
      }
    );

    // Enhanced session check with error handling
    const checkInitialSession = async () => {
      console.log('🔐 Checking for existing session...');
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('🔐 Session check error:', error);
          // Handle specific refresh token errors
          if (error.message.includes('refresh_token_not_found') || error.message.includes('Invalid Refresh Token')) {
            console.log('🔐 Invalid refresh token, clearing local storage');
            localStorage.removeItem('supabase.auth.token');
            setSession(null);
            setUser(null);
          }
          setIsLoading(false);
          return;
        }
        
        if (currentSession?.user) {
          console.log('🔐 Existing session found for:', currentSession.user.email);
          try {
            const mappedUser = await mapSupabaseUser(currentSession.user);
            setSession(currentSession);
            setUser(mappedUser);
            setupTokenRefresh(currentSession);
          } catch (error) {
            console.error('🔐 Error mapping existing user:', error);
            setSession(null);
            setUser(null);
          }
        } else {
          console.log('🔐 No existing session found');
        }
        
        clearTimeout(loadingTimeout);
        setIsLoading(false);
      } catch (error) {
        console.error('🔐 Session check failed:', error);
        clearTimeout(loadingTimeout);
        setIsLoading(false);
      }
    };

    checkInitialSession();

    return () => {
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
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

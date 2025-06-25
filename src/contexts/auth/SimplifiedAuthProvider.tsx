
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

  // Simplified login without security audit logging during initial load
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
            console.error("Token refresh failed:", error);
            logout();
          }
        }, refreshTime);
      }
    }
  };

  // Simplified auth initialization with shorter timeout
  useEffect(() => {
    if (authInitializedRef.current) return;
    authInitializedRef.current = true;

    console.log('🔐 Initializing simplified authentication...');
    
    // Set loading timeout - shorter timeout for better UX
    const loadingTimeout = setTimeout(() => {
      console.warn('⚠️ Authentication initialization timeout - setting not loading');
      setIsLoading(false);
    }, 5000); // 5 second timeout instead of 10

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log(`🔐 Auth event: ${event}`);
        
        setSession(newSession);
        
        if (newSession?.user) {
          try {
            const mappedUser = await mapSupabaseUser(newSession.user);
            setUser(mappedUser);
            setupTokenRefresh(newSession);
          } catch (error) {
            console.error('Error mapping user:', error);
            setUser(null);
          }
        } else {
          setUser(null);
        }
        
        clearTimeout(loadingTimeout);
        setIsLoading(false);
      }
    );

    // Check for existing session with shorter timeout
    const sessionCheckPromise = supabase.auth.getSession();
    const sessionTimeout = setTimeout(() => {
      console.warn('⚠️ Session check timeout');
      clearTimeout(loadingTimeout);
      setIsLoading(false);
    }, 3000); // 3 second timeout for session check

    sessionCheckPromise.then(async ({ data: { session: currentSession } }) => {
      clearTimeout(sessionTimeout);
      
      if (currentSession?.user) {
        console.log('🔐 Existing session found');
        try {
          const mappedUser = await mapSupabaseUser(currentSession.user);
          setSession(currentSession);
          setUser(mappedUser);
          setupTokenRefresh(currentSession);
        } catch (error) {
          console.error('Error mapping existing user:', error);
        }
      }
      
      clearTimeout(loadingTimeout);
      setIsLoading(false);
    }).catch(error => {
      console.error('Error checking session:', error);
      clearTimeout(loadingTimeout);
      clearTimeout(sessionTimeout);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
      clearTimeout(sessionTimeout);
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

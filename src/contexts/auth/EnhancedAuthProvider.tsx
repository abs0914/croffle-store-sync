
import React, { createContext, useContext, ReactNode, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session, AuthState } from "./types";
import { useAuthState } from "./useAuthState";
import { checkPermission, checkStoreAccess, mapSupabaseUser } from "./utils";
import { UserRole } from "@/types";
import { useSecurityAudit } from "./SecurityAuditContext";

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

export function EnhancedAuthProvider({ children }: { children: ReactNode }) {
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
    login: baseLogin,
    register: baseRegister,
    logout: baseLogout
  } = useAuthState();
  
  const { logSecurityEvent } = useSecurityAudit();
  const failedLoginAttempts = useRef(0);
  const lastFailedLoginTime = useRef<Date | null>(null);
  
  // Enhanced login with security logging
  const login = async (email: string, password: string) => {
    try {
      // Check for rate limiting (max 5 attempts per 15 minutes)
      const now = new Date();
      if (failedLoginAttempts.current >= 5 && 
          lastFailedLoginTime.current && 
          (now.getTime() - lastFailedLoginTime.current.getTime()) < 15 * 60 * 1000) {
        await logSecurityEvent('login_rate_limited', { email });
        throw new Error('Too many failed login attempts. Please try again in 15 minutes.');
      }
      
      const result = await baseLogin(email, password);
      
      // Reset failed attempts on successful login
      failedLoginAttempts.current = 0;
      lastFailedLoginTime.current = null;
      
      await logSecurityEvent('login_success', { email });
      return result;
    } catch (error: any) {
      failedLoginAttempts.current++;
      lastFailedLoginTime.current = now;
      await logSecurityEvent('login_failed', { email, error: error.message });
      throw error;
    }
  };
  
  // Enhanced register with security logging
  const register = async (email: string, password: string, userData?: any) => {
    try {
      const result = await baseRegister(email, password, userData);
      
      await logSecurityEvent('register_success', { email });
      return result;
    } catch (error: any) {
      await logSecurityEvent('register_failed', { email, error: error.message });
      throw error;
    }
  };
  
  // Enhanced logout with security logging
  const logout = async () => {
    try {
      await logSecurityEvent('logout_initiated', { user_id: user?.id });
      const result = await baseLogout();
      await logSecurityEvent('logout_success', { user_id: user?.id });
      return result;
    } catch (error: any) {
      await logSecurityEvent('logout_error', { user_id: user?.id, error: error.message });
      throw error;
    }
  };

  // Session validation and suspicious activity detection
  useEffect(() => {
    if (!session || !user) return;
    
    const validateSession = async () => {
      try {
        // Check if session is still valid
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error || !currentSession) {
          await logSecurityEvent('session_invalid', { user_id: user.id });
          setSession(null);
          setUser(null);
          return;
        }
        
        // Check for suspicious activity (e.g., session from different device)
        const userAgent = navigator.userAgent;
        const sessionUserAgent = currentSession.user?.user_metadata?.user_agent;
        
        if (sessionUserAgent && sessionUserAgent !== userAgent) {
          await logSecurityEvent('suspicious_session', { 
            user_id: user.id,
            current_agent: userAgent,
            session_agent: sessionUserAgent
          });
        }
        
      } catch (error: any) {
        console.error('Session validation error:', error);
        await logSecurityEvent('session_validation_error', { 
          user_id: user.id, 
          error: error.message 
        });
      }
    };
    
    // Validate session every 5 minutes
    const interval = setInterval(validateSession, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [session, user]);

  // Cross-tab session synchronization with security logging
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key?.includes('supabase.auth') && event.newValue !== event.oldValue) {
        logSecurityEvent('cross_tab_sync', { 
          user_id: user?.id,
          event_key: event.key
        });
        
        supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
          if (currentSession?.user) {
            const mappedUser = await mapSupabaseUser(currentSession.user);
            setSession(currentSession);
            setUser(mappedUser);
          } else if (session) {
            setSession(null);
            setUser(null);
          }
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [session, user]);

  // Main auth initialization with enhanced security
  useEffect(() => {
    authErrorHandledRef.current = false;
    setIsLoading(true);
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        await logSecurityEvent('auth_state_change', { event, user_id: newSession?.user?.id });
        
        setSession(newSession);
        
        if (newSession?.user) {
          setTimeout(async () => {
            const mappedUser = await mapSupabaseUser(newSession.user);
            setUser(mappedUser);
            setIsLoading(false);
            setupTokenRefresh(newSession);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      if (currentSession?.user) {
        const mappedUser = await mapSupabaseUser(currentSession.user);
        setSession(currentSession);
        setUser(mappedUser);
        setupTokenRefresh(currentSession);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
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

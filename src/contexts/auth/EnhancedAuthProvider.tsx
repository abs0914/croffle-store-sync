
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
  
  // Enhanced login with security logging and rate limiting
  const login = async (email: string, password: string) => {
    try {
      // Input validation
      if (!email || !password) {
        await logSecurityEvent('login_invalid_input', { email }, 'warning');
        throw new Error('Email and password are required');
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        await logSecurityEvent('login_invalid_email_format', { email }, 'warning');
        throw new Error('Invalid email format');
      }

      // Check for rate limiting (max 5 attempts per 15 minutes)
      const now = new Date();
      if (failedLoginAttempts.current >= 5 && 
          lastFailedLoginTime.current && 
          (now.getTime() - lastFailedLoginTime.current.getTime()) < 15 * 60 * 1000) {
        await logSecurityEvent('login_rate_limited', { email }, 'warning');
        throw new Error('Too many failed login attempts. Please try again in 15 minutes.');
      }
      
      const result = await baseLogin(email, password);
      
      // Reset failed attempts on successful login
      failedLoginAttempts.current = 0;
      lastFailedLoginTime.current = null;
      
      await logSecurityEvent('login_success', { email }, 'info');
      return result;
    } catch (error: any) {
      failedLoginAttempts.current++;
      lastFailedLoginTime.current = new Date();
      await logSecurityEvent('login_failed', { 
        email, 
        error: error.message,
        attempt_number: failedLoginAttempts.current
      }, 'warning');
      throw error;
    }
  };
  
  // Enhanced register with security logging and validation
  const register = async (email: string, password: string, userData?: any) => {
    try {
      // Input validation
      if (!email || !password) {
        await logSecurityEvent('register_invalid_input', { email }, 'warning');
        throw new Error('Email and password are required');
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        await logSecurityEvent('register_invalid_email_format', { email }, 'warning');
        throw new Error('Invalid email format');
      }

      // Password strength validation
      if (password.length < 8) {
        await logSecurityEvent('register_weak_password', { email }, 'warning');
        throw new Error('Password must be at least 8 characters long');
      }

      // Check for password complexity
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
        await logSecurityEvent('register_insufficient_password_complexity', { email }, 'warning');
        throw new Error('Password must contain uppercase, lowercase, numbers, and special characters');
      }
      
      const result = await baseRegister(email, password, userData);
      
      await logSecurityEvent('register_success', { email }, 'info');
      return result;
    } catch (error: any) {
      await logSecurityEvent('register_failed', { 
        email, 
        error: error.message 
      }, 'error');
      throw error;
    }
  };
  
  // Enhanced logout with security logging
  const logout = async () => {
    try {
      await logSecurityEvent('logout_initiated', { user_id: user?.id }, 'info');
      const result = await baseLogout();
      await logSecurityEvent('logout_success', { user_id: user?.id }, 'info');
      return result;
    } catch (error: any) {
      await logSecurityEvent('logout_error', { 
        user_id: user?.id, 
        error: error.message 
      }, 'error');
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
          await logSecurityEvent('session_invalid', { user_id: user.id }, 'warning');
          setSession(null);
          setUser(null);
          return;
        }
        
        // Check for suspicious activity (session from different device/location)
        const userAgent = navigator.userAgent;
        const sessionUserAgent = currentSession.user?.user_metadata?.user_agent;
        
        if (sessionUserAgent && sessionUserAgent !== userAgent) {
          await logSecurityEvent('suspicious_session_detected', { 
            user_id: user.id,
            current_agent: userAgent,
            session_agent: sessionUserAgent
          }, 'warning');
        }
        
        // Check for session duration (auto-logout after 8 hours of inactivity)
        const sessionAge = Date.now() - new Date(currentSession.user.last_sign_in_at || 0).getTime();
        const maxSessionAge = 8 * 60 * 60 * 1000; // 8 hours
        
        if (sessionAge > maxSessionAge) {
          await logSecurityEvent('session_expired_timeout', { user_id: user.id }, 'info');
          await logout();
        }
        
      } catch (error: any) {
        console.error('Session validation error:', error);
        await logSecurityEvent('session_validation_error', { 
          user_id: user.id, 
          error: error.message 
        }, 'error');
      }
    };
    
    // Validate session every 5 minutes
    const interval = setInterval(validateSession, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [session, user]);

  // Enhanced cross-tab session synchronization with security logging
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key?.includes('supabase.auth') && event.newValue !== event.oldValue) {
        logSecurityEvent('cross_tab_sync_detected', { 
          user_id: user?.id,
          event_key: event.key
        }, 'info');
        
        supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
          if (currentSession?.user) {
            const mappedUser = await mapSupabaseUser(currentSession.user);
            setSession(currentSession);
            setUser(mappedUser);
          } else if (session) {
            await logSecurityEvent('cross_tab_logout_detected', { 
              user_id: user?.id 
            }, 'info');
            setSession(null);
            setUser(null);
          }
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [session, user]);

  // Main auth initialization with enhanced security logging
  useEffect(() => {
    authErrorHandledRef.current = false;
    setIsLoading(true);
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        await logSecurityEvent('auth_state_change', { 
          event, 
          user_id: newSession?.user?.id 
        }, 'info');
        
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

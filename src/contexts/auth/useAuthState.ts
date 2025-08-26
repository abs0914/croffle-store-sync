
import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "./types";
import { toast } from "sonner";
import { mapSupabaseUser } from "./user-mapping-utils";

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const authErrorHandledRef = useRef(false);

  // Security audit functions
  const logSecurityEvent = useCallback(async (
    eventType: string,
    eventData: any = {},
    riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ) => {
    try {
      await supabase.rpc('log_security_event', {
        p_event_type: eventType,
        p_event_data: eventData,
        p_risk_level: riskLevel
      });
    } catch (err) {
      console.error('Security audit logging error:', err);
    }
  }, []);

  const checkRateLimit = useCallback(async (
    identifier: string,
    identifierType: 'email' | 'ip' = 'email'
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('check_auth_rate_limit', {
        p_identifier: identifier,
        p_identifier_type: identifierType
      });

      if (error) {
        console.error('Rate limit check failed:', error);
        return true; // Allow if check fails
      }

      return data;
    } catch (err) {
      console.error('Rate limit check error:', err);
      return true; // Allow if check fails
    }
  }, []);

  const validatePasswordStrength = useCallback(async (password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('validate_password_strength', {
        password
      });

      if (error) {
        console.error('Password validation failed:', error);
        return false;
      }

      return data;
    } catch (err) {
      console.error('Password validation error:', err);
      return false;
    }
  }, []);

  const setupTokenRefresh = useCallback((session: Session) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    if (session.expires_at) {
      const refreshTime = (session.expires_at * 1000) - Date.now() - 60000; // Refresh 1 minute before expiry
      if (refreshTime > 0) {
        refreshTimeoutRef.current = setTimeout(async () => {
          try {
            const { data, error } = await supabase.auth.refreshSession();
            if (error) throw error;
            if (data.session) {
              setSession(data.session);
              await logSecurityEvent('token_refreshed', {}, 'low');
              setupTokenRefresh(data.session);
            }
          } catch (error) {
            console.error("Token refresh failed:", error);
            await logSecurityEvent('token_refresh_failed', { error: String(error) }, 'medium');
            toast.error("Session expired. Please log in again.");
            logout();
          }
        }, refreshTime);
      }
    }
  }, [logSecurityEvent]);

  const login = async (email: string, password: string) => {
    try {
      // Check rate limiting
      const isAllowed = await checkRateLimit(email);
      if (!isAllowed) {
        await logSecurityEvent('auth_rate_limited', { email }, 'high');
        throw new Error('Too many login attempts. Please try again later.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        await logSecurityEvent('login_failed', { 
          email, 
          error: error.message 
        }, 'medium');
        throw error;
      }

      if (data.user) {
        const mappedUser = await mapSupabaseUser(data.user);
        setUser(mappedUser);
        setSession(data.session);
        
        await logSecurityEvent('login_successful', { 
          user_id: data.user.id,
          email 
        }, 'low');

        if (data.session) {
          setupTokenRefresh(data.session);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      // Validate password strength
      const isStrongPassword = await validatePasswordStrength(password);
      if (!isStrongPassword) {
        throw new Error('Password must be at least 8 characters with uppercase, lowercase, and numbers');
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name,
            first_name: name.split(' ')[0] || name,
            last_name: name.split(' ').slice(1).join(' ') || '',
          }
        }
      });

      if (error) {
        await logSecurityEvent('registration_failed', { 
          email, 
          error: error.message 
        }, 'medium');
        throw error;
      }

      if (data.user) {
        await logSecurityEvent('registration_successful', { 
          user_id: data.user.id,
          email 
        }, 'low');

        // If user is confirmed immediately, set up session
        if (data.session) {
          const mappedUser = await mapSupabaseUser(data.user);
          setUser(mappedUser);
          setSession(data.session);
          setupTokenRefresh(data.session);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    const currentUser = user;
    
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    try {
      // Clear local state immediately to prevent UI issues
      setUser(null);
      setSession(null);
      
      // Attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (currentUser) {
        await logSecurityEvent('logout_successful', { 
          user_id: currentUser.id,
          email: currentUser.email 
        }, 'low');
      }
      
      // Don't treat "session not found" as an error since we're logging out anyway
      if (error && !error.message.includes('session not found') && !error.message.includes('Session not found')) {
        console.error("Logout error:", error);
        await logSecurityEvent('logout_failed', { error: error.message }, 'medium');
        toast.error("Error logging out");
      } else {
        toast.success("Logged out successfully");
      }
    } catch (error: any) {
      console.error("Logout error:", error);
      // Don't show error toast for session not found errors during logout
      if (!error.message?.includes('session not found') && !error.message?.includes('Session not found')) {
        await logSecurityEvent('logout_failed', { error: error.message }, 'medium');
        toast.error("Error logging out");
      } else {
        toast.success("Logged out successfully");
      }
    }
  };

  return {
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
  };
};

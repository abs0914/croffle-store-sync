
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "./types";
import { toast } from "sonner";

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const authErrorHandledRef = useRef(false);

  const setupTokenRefresh = (session: Session) => {
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
              setupTokenRefresh(data.session);
            }
          } catch (error) {
            console.error("Token refresh failed:", error);
            toast.error("Session expired. Please log in again.");
            logout();
          }
        }, refreshTime);
      }
    }
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
        },
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
    
    try {
      // Clear local state immediately to prevent UI issues
      setUser(null);
      setSession(null);
      
      // Attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      // Don't treat "session not found" as an error since we're logging out anyway
      if (error && !error.message.includes('session not found') && !error.message.includes('Session not found')) {
        console.error("Logout error:", error);
        toast.error("Error logging out");
      } else {
        toast.success("Logged out successfully");
      }
    } catch (error: any) {
      console.error("Logout error:", error);
      // Don't show error toast for session not found errors during logout
      if (!error.message?.includes('session not found') && !error.message?.includes('Session not found')) {
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

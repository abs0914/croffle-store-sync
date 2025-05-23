
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Session } from "./types";
import { mapSupabaseUser } from "./utils";

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authErrorHandledRef = useRef(false);
  
  // Setup token refresh and session handling
  const setupTokenRefresh = (currentSession: Session | null) => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    if (currentSession?.expires_at) {
      const expiresAt = currentSession.expires_at * 1000; // Convert to milliseconds
      const now = Date.now();
      
      // Calculate time until token needs refresh (5 minutes before expiry)
      const timeUntilRefresh = Math.max(0, expiresAt - now - 5 * 60 * 1000);
      
      console.log(`Session token will refresh in ${Math.floor(timeUntilRefresh / 60000)} minutes`);
      
      // Set timeout to refresh token before it expires
      refreshTimeoutRef.current = setTimeout(async () => {
        console.log('Refreshing auth token...');
        try {
          const { data, error } = await supabase.auth.refreshSession();
          
          if (error) {
            console.error('Error refreshing token:', error);
            if (!authErrorHandledRef.current) {
              authErrorHandledRef.current = true;
              toast.error('Your session has expired. Please log in again.');
              setSession(null);
              setUser(null);
            }
          } else if (data.session) {
            console.log('Token refreshed successfully');
            setSession(data.session);
            setupTokenRefresh(data.session);
          }
        } catch (err) {
          console.error('Exception during token refresh:', err);
        }
      }, timeUntilRefresh);
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      if (data.user) {
        const mappedUser = await mapSupabaseUser(data.user);
        setUser(mappedUser);
        setSession(data.session);
        
        // Setup token refresh
        setupTokenRefresh(data.session);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Failed to login");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      
      // Clear any token refresh timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      
      setUser(null);
      setSession(null);
      
      // Reset error handling flag on logout
      authErrorHandledRef.current = false;
      
    } catch (error: any) {
      console.error("Logout error:", error);
      toast.error(error.message || "Failed to logout");
      throw error;
    } finally {
      setIsLoading(false);
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
    logout
  };
}

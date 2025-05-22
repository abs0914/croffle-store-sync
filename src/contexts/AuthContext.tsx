import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { User, UserRole, Session } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (requiredRole: UserRole) => boolean;
  hasStoreAccess: (storeId: string) => boolean;
}

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  hasPermission: () => false,
  hasStoreAccess: () => false,
};

const AuthContext = createContext<AuthState>(initialState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authErrorHandledRef = useRef(false);
  
  // Clear any existing timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);
  
  // Map Supabase auth user to our app's User type
  const mapSupabaseUser = async (supabaseUser: any): Promise<User> => {
    // Get email to determine initial role mapping
    const email = supabaseUser.email;
    let role: UserRole = mapUserRole(email);
    
    // For cashier users, fetch associated store IDs from the cashiers table
    let storeIds: string[] = ['1']; // Default store ID
    
    if (role === 'cashier') {
      try {
        const { data } = await supabase
          .from('cashiers')
          .select('store_id')
          .eq('user_id', supabaseUser.id);
        
        if (data && data.length > 0) {
          storeIds = data.map(item => item.store_id);
        }
      } catch (error) {
        console.error('Error fetching cashier store assignments:', error);
      }
    } else {
      // For non-cashiers (admins, owners, managers), fetch from user_stores or give access to all
      try {
        const { data } = await supabase
          .from('stores')
          .select('id');
          
        if (data && data.length > 0) {
          storeIds = data.map(store => store.id);
        }
      } catch (error) {
        console.error('Error fetching store IDs:', error);
      }
    }

    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0],
      role: role,
      storeIds: storeIds,
      avatar: supabaseUser.user_metadata?.avatar_url || 'https://github.com/shadcn.png',
    };
  };

  // Simple role mapping based on email (for test users)
  const mapUserRole = (email: string): UserRole => {
    if (email === 'admin@example.com') return 'admin';
    if (email === 'owner@example.com') return 'owner';
    if (email === 'manager@example.com') return 'manager';
    if (email === 'marasabaras@croffle.com' || email === 'robinsons.north@croffle.com') return 'cashier';
    return 'cashier'; // Default role
  };

  // Setup cross-tab session synchronization through localStorage events
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key?.includes('supabase.auth') && event.newValue !== event.oldValue) {
        console.log('Auth state changed in another tab, synchronizing...');
        
        // Refresh the session state from storage
        supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
          if (currentSession?.user) {
            console.log('Session found in another tab, updating local state');
            const mappedUser = await mapSupabaseUser(currentSession.user);
            setSession(currentSession);
            setUser(mappedUser);
          } else if (session) {
            // User logged out in another tab
            console.log('User logged out in another tab');
            setSession(null);
            setUser(null);
          }
        }).catch(error => {
          console.error("Error syncing session across tabs:", error);
        });
      }
    };

    // Add storage event listener for cross-tab synchronization
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [session]);

  // Handle token refresh and session recovery
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

  // Main auth initialization effect
  useEffect(() => {
    // Reset error handling flag on mount
    authErrorHandledRef.current = false;
    setIsLoading(true);
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log(`Auth state changed: ${event}`);
        
        // Only update session state synchronously
        setSession(newSession);
        
        if (newSession?.user) {
          // Use setTimeout to avoid recursive auth state changes
          setTimeout(async () => {
            const mappedUser = await mapSupabaseUser(newSession.user);
            setUser(mappedUser);
            setIsLoading(false);
            
            // Setup token refresh for the new session
            setupTokenRefresh(newSession);
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
        console.log('Existing session found');
        const mappedUser = await mapSupabaseUser(currentSession.user);
        setSession(currentSession);
        setUser(mappedUser);
        
        // Setup token refresh
        setupTokenRefresh(currentSession);
      } else {
        console.log('No existing session found');
      }
      setIsLoading(false);
    }).catch(error => {
      console.error("Error checking session:", error);
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
      console.log('Network connection restored');
      
      // Check if we have a user but need to refresh the session
      if (user && !session) {
        console.log('Attempting to restore session after network reconnection');
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
          if (currentSession) {
            setSession(currentSession);
            setupTokenRefresh(currentSession);
          }
        });
      }
    };
    
    const handleOffline = () => {
      console.log('Network connection lost');
      // We keep the current user/session state when offline
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, session]);

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

  const hasPermission = (requiredRole: UserRole): boolean => {
    if (!user) return false;
    
    const roleHierarchy: Record<UserRole, number> = {
      admin: 4,
      owner: 3,
      manager: 2,
      cashier: 1
    };
    
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  };

  const hasStoreAccess = (storeId: string): boolean => {
    if (!user) return false;
    return user.storeIds.includes(storeId);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user,
        login,
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

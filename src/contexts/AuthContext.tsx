
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
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

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // Only update session state synchronously
        setSession(newSession);
        
        if (newSession?.user) {
          // Use setTimeout to avoid recursive auth state changes
          setTimeout(async () => {
            const mappedUser = await mapSupabaseUser(newSession.user);
            setUser(mappedUser);
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user) {
        const mappedUser = await mapSupabaseUser(currentSession.user);
        setUser(mappedUser);
      }
      setIsLoading(false);
    }).catch(error => {
      console.error("Error checking session:", error);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
      setUser(null);
      setSession(null);
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

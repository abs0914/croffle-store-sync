
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { User, UserRole } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (requiredRole: UserRole) => boolean;
  hasStoreAccess: (storeId: string) => boolean;
}

const initialState: AuthState = {
  user: null,
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
  const [isLoading, setIsLoading] = useState(true);
  
  // Function to convert Supabase profile data to our app's User type
  const mapProfileToUser = async (supabaseUser: any): Promise<User | null> => {
    if (!supabaseUser) return null;
    
    try {
      // Fetch the user's profile from our profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();
      
      if (profileError) {
        console.error("Profile fetch error:", profileError);
        throw new Error("Unable to retrieve user profile");
      }
      
      if (!profileData) {
        console.error("Profile not found for user:", supabaseUser.id);
        return null;
      }
      
      // Fetch the user's store access
      const { data: storeAccess, error: storeError } = await supabase
        .from('user_store_access')
        .select('store_id')
        .eq('user_id', supabaseUser.id);
      
      if (storeError) {
        console.error("Store access fetch error:", storeError);
        throw storeError;
      }
      
      // Map the data to our User type
      return {
        id: supabaseUser.id,
        email: profileData.email,
        name: profileData.name,
        role: profileData.role as UserRole,
        storeIds: storeAccess?.map(access => access.store_id) || [],
        avatar: profileData.avatar || undefined,
      };
    } catch (error) {
      console.error("Error mapping profile:", error);
      throw error;
    }
  };

  // Check for existing session on component mount
  useEffect(() => {
    const checkUser = async () => {
      try {
        setIsLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session?.user) {
          try {
            const mappedUser = await mapProfileToUser(session.user);
            setUser(mappedUser);
          } catch (profileError) {
            console.error("Error fetching profile:", profileError);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth session check error:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkUser();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const mappedUser = await mapProfileToUser(session.user);
          setUser(mappedUser);
        } catch (profileError) {
          console.error("Error fetching profile on sign in:", profileError);
          setUser(null);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
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
        password,
      });
      
      if (error) throw error;
      
      if (data.user) {
        try {
          const mappedUser = await mapProfileToUser(data.user);
          
          if (!mappedUser) {
            throw new Error("Unable to retrieve user profile");
          }
          
          setUser(mappedUser);
          toast.success(`Welcome back, ${mappedUser.name}!`);
        } catch (profileError) {
          console.error("Profile mapping error:", profileError);
          throw profileError;
        }
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Failed to log in");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      setUser(null);
      toast.info("You have been logged out");
    } catch (error: any) {
      console.error("Logout error:", error);
      toast.error(error.message || "Failed to log out");
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
    
    // Admins have access to all stores
    if (user.role === 'admin') return true;
    
    return user.storeIds.includes(storeId);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
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

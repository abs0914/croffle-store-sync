
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { User, UserRole } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { mapProfileToUser } from "@/services/authUserMapper";
import { hasPermission as checkPermission, hasStoreAccess as checkStoreAccess } from "@/services/authService";

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

  // Check for existing session on component mount
  useEffect(() => {
    const checkUser = async () => {
      try {
        setIsLoading(true);
        console.log('Checking for existing session...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
          throw error;
        }
        
        console.log('Session check complete:', session ? 'Session exists' : 'No session');
        
        if (session?.user) {
          try {
            console.log('Mapping user from session...');
            const mappedUser = await mapProfileToUser(session.user);
            console.log('User mapped successfully:', mappedUser);
            setUser(mappedUser);
          } catch (profileError) {
            console.error("Error fetching profile:", profileError);
            setUser(null);
          }
        } else {
          console.log('No user in session, setting user to null');
          setUser(null);
        }
      } catch (error) {
        console.error("Auth session check error:", error);
        setUser(null);
      } finally {
        console.log('Finishing session check, setting isLoading to false');
        setIsLoading(false);
      }
    };
    
    checkUser();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          console.log('User signed in, mapping profile...');
          const mappedUser = await mapProfileToUser(session.user);
          console.log('Profile mapped after sign in:', mappedUser);
          setUser(mappedUser);
        } catch (profileError) {
          console.error("Error fetching profile on sign in:", profileError);
          setUser(null);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out, clearing user state');
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
      console.log('Attempting to log in user:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error);
        throw error;
      }
      
      console.log('Sign in successful, user:', data.user?.id);
      
      if (data.user) {
        try {
          console.log('Mapping user profile after login...');
          const mappedUser = await mapProfileToUser(data.user);
          
          if (!mappedUser) {
            console.error('No mapped user returned');
            throw new Error("Unable to retrieve user profile");
          }
          
          console.log('Setting user state after successful mapping');
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
      console.log('Login attempt complete, setting isLoading to false');
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

  // Using the utility functions with the current user state
  const hasPermission = (requiredRole: UserRole): boolean => {
    return checkPermission(user?.role, requiredRole);
  };

  const hasStoreAccess = (storeId: string): boolean => {
    return checkStoreAccess(user?.role, user?.storeIds || [], storeId);
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

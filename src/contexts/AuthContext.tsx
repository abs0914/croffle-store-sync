
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

// Constants for Supabase URLs
const SUPABASE_URL = "https://bwmkqscqkfoezcuzgpwq.supabase.co";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Function to convert Supabase profile data to our app's User type
  const mapProfileToUser = async (supabaseUser: any): Promise<User | null> => {
    if (!supabaseUser) return null;
    
    try {
      console.log('Mapping user profile for ID:', supabaseUser.id);
      
      // First check if the profile exists
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();
      
      if (profileError) {
        console.error("Profile fetch error:", profileError);
        throw new Error("Unable to retrieve user profile");
      }
      
      // If profile doesn't exist, try to set up the user account
      if (!profileData) {
        console.log('Profile not found, attempting to create one via edge function');
        try {
          // Call the setup-users edge function to create missing profiles
          const response = await fetch(`${SUPABASE_URL}/functions/v1/setup-users`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabase.supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: supabaseUser.id }),
          });
          
          console.log('Edge function response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to set up user account:', errorText);
            throw new Error(`Failed to set up user account: ${errorText}`);
          }
          
          const responseData = await response.json();
          console.log('Edge function response:', responseData);
        } catch (fetchError) {
          console.error('Error calling edge function:', fetchError);
          throw new Error(`Error calling edge function: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
        }
        
        // Try fetching profile again
        const { data: newProfileData, error: newProfileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', supabaseUser.id)
          .maybeSingle();
          
        if (newProfileError) {
          console.error("Profile refetch error:", newProfileError);
          throw new Error("Unable to retrieve created user profile");
        }
        
        if (!newProfileData) {
          console.error("Profile still not found after creation attempt");
          throw new Error("Profile creation failed - no data returned");
        }
        
        console.log('Profile created successfully:', newProfileData);
        
        // Use the newly created profile data
        profileData = newProfileData;
      }
      
      console.log('Profile data found:', profileData);
      
      // Fetch the user's store access
      const { data: storeAccess, error: storeError } = await supabase
        .from('user_store_access')
        .select('store_id')
        .eq('user_id', supabaseUser.id);
      
      if (storeError) {
        console.error("Store access fetch error:", storeError);
        // Don't throw here, just use empty array for store IDs
      }
      
      console.log('Store access:', storeAccess);
      
      // Map the data to our User type
      const mappedUser = {
        id: supabaseUser.id,
        email: profileData.email,
        name: profileData.name,
        role: profileData.role as UserRole,
        storeIds: storeAccess?.map(access => access.store_id) || [],
        avatar: profileData.avatar || undefined,
      };
      
      console.log('Mapped user:', mappedUser);
      return mappedUser;
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

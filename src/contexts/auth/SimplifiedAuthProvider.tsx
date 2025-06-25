
import React, { createContext, useContext, ReactNode, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session, AuthState } from "./types";
import { checkPermission, checkStoreAccess } from "./utils";
import { enhancedMapSupabaseUser } from "./enhancedUserMapping";
import { authDebugger } from "@/utils/authDebug";
import { UserRole } from "@/types";

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

export function SimplifiedAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authInitializedRef = useRef(false);

  // Simplified login with better error handling
  const login = async (email: string, password: string) => {
    authDebugger.log('Login attempt started', { email });
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        authDebugger.log('Login failed', { error: error.message, email }, 'error');
        throw error;
      }
      
      authDebugger.log('Login successful', { email });
    } catch (error) {
      authDebugger.log('Login error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        email 
      }, 'error');
      throw error;
    }
  };

  const register = async (email: string, password: string, userData?: any) => {
    authDebugger.log('Registration attempt started', { email });
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData || {},
      },
    });

    if (error) {
      authDebugger.log('Registration failed', { error: error.message, email }, 'error');
      throw error;
    }

    authDebugger.log('Registration successful', { email });
  };

  const logout = async () => {
    authDebugger.log('Logout initiated');
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        authDebugger.log('Logout error', { error: error.message }, 'error');
      } else {
        authDebugger.log('Logout successful');
        setUser(null);
        setSession(null);
      }
    } catch (error) {
      authDebugger.log('Logout failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 'error');
      // Force clear state even if logout fails
      setUser(null);
      setSession(null);
    }
  };

  // Simplified auth initialization
  useEffect(() => {
    if (authInitializedRef.current) return;
    authInitializedRef.current = true;

    authDebugger.log('Initializing authentication system');

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        authDebugger.log('Auth state change event', { 
          event, 
          hasSession: !!newSession,
          userId: newSession?.user?.id 
        });
        
        try {
          setSession(newSession);
          
          if (newSession?.user) {
            // Map user in background to avoid blocking UI
            const mappedUser = await enhancedMapSupabaseUser(newSession.user);
            setUser(mappedUser);
            authDebugger.log('User authenticated and mapped', { 
              userId: mappedUser.id,
              email: mappedUser.email,
              role: mappedUser.role 
            });
          } else {
            setUser(null);
            authDebugger.log('User not authenticated');
          }
        } catch (error) {
          authDebugger.log('Error in auth state change handler', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }, 'error');
          setUser(null);
          setSession(null);
        } finally {
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    const checkInitialSession = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          authDebugger.log('Session check error', { error: error.message }, 'error');
          setIsLoading(false);
          return;
        }
        
        if (currentSession?.user) {
          authDebugger.log('Existing session found', { 
            userId: currentSession.user.id,
            email: currentSession.user.email 
          });
          // Let the auth state change handler deal with this
        } else {
          authDebugger.log('No existing session found');
          setIsLoading(false);
        }
      } catch (error) {
        authDebugger.log('Session check failed', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }, 'error');
        setIsLoading(false);
      }
    };

    checkInitialSession();

    return () => subscription.unsubscribe();
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

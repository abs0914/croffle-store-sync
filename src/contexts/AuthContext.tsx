
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { User, UserRole } from "@/types";

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
  
  useEffect(() => {
    // For demo purposes, set a mock user
    // In a real app, this would check session state with Supabase
    const mockUser: User = {
      id: '1',
      email: 'demo@crofflestore.com',
      name: 'Demo User',
      role: 'manager',
      storeIds: ['1'],
      avatar: 'https://github.com/shadcn.png',
    };
    
    setTimeout(() => {
      setUser(mockUser);
      setIsLoading(false);
    }, 1000);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // This would use Supabase auth in a real app
      const mockUser: User = {
        id: '1',
        email,
        name: 'Demo User',
        role: 'manager',
        storeIds: ['1'],
        avatar: 'https://github.com/shadcn.png',
      };
      setUser(mockUser);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // This would use Supabase auth in a real app
      setUser(null);
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

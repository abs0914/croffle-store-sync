
import { UserRole } from '@/types';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string; // Full name computed from firstName + lastName
  role: UserRole;
  storeIds: string[];
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: any;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userData?: any) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (role: UserRole) => boolean;
  hasStoreAccess: (storeId: string) => boolean;
}

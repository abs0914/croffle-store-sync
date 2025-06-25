
export type UserRole = 'admin' | 'owner' | 'manager' | 'cashier' | 'staff';

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user?: any;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  storeIds: string[];
  avatar?: string;
}

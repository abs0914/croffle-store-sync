
import { UserRole } from "./user";
import { RolePermissions } from "./rolePermissions";

export interface AppUser {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  contactNumber: string | null;
  role: UserRole;
  storeIds: string[];
  isActive: boolean;
  fullName?: string;
  createdAt: string;
  updatedAt: string;
  customPermissions?: Partial<RolePermissions>;
}

export interface AppUserFormData {
  id?: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  role: UserRole;
  storeIds: string[];
  isActive: boolean;
  password?: string;
  customPermissions?: Partial<RolePermissions>;
}

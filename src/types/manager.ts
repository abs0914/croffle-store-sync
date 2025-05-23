
export interface Manager {
  id: string;
  first_name: string;
  last_name: string;
  fullName?: string; // Maintained for backward compatibility
  storeIds: string[];
  contactNumber?: string;
  email?: string;
  isActive: boolean;
}

export interface ManagerFormData {
  firstName: string;
  lastName: string;
  contactNumber: string;
  email: string;
  storeIds: string[];
  isActive: boolean;
}

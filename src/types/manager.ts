
export interface Manager {
  id: string;
  fullName: string;
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

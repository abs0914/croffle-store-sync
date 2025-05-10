
export interface Cashier {
  id: string;
  userId: string | null;
  storeId: string;
  firstName: string;
  lastName: string;
  contactNumber?: string | null;
  isActive: boolean;
  fullName: string;
}

export interface CashierFormData {
  firstName: string;
  lastName: string;
  contactNumber?: string;
  userId?: string | null;
  isActive?: boolean;
}


export type UserRole = 'admin' | 'owner' | 'manager' | 'cashier' | 'staff';

export interface Store {
  id: string;
  name: string;
  location: string;
  phone?: string;
  email?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  price: number;
  cost?: number;
  stock_quantity: number;
  category_id?: string;
  store_id: string;
  image_url?: string;
  barcode?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  store_id: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  store_id: string;
  customer_id?: string;
  cashier_id?: string;
  total: number;
  tax_amount?: number;
  discount_amount?: number;
  payment_method: string;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  created_at: string;
  updated_at: string;
}


export type UserRole = 'admin' | 'owner' | 'manager' | 'cashier' | 'staff';

// Shift type alias
export type ShiftType = Shift;

export interface Store {
  id: string;
  name: string;
  location: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_id?: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Additional properties for admin components
  location_type?: string;
  region?: string;
  logistics_zone?: string;
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
  image?: string;
  barcode?: string;
  is_active: boolean;
  isActive?: boolean; // Legacy compatibility
  category?: Category | string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  store_id: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductVariation {
  id: string;
  product_id: string;
  name: string;
  price: number;
  stock_quantity: number;
  size?: string;
  sku?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  store_id: string;
  address?: string;
  storeName?: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  productId: string;
  variationId?: string;
  product: Product;
  variation?: ProductVariation;
  quantity: number;
  price: number;
  notes?: string;
}

export interface TransactionItem {
  productId: string;
  variationId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Transaction {
  id: string;
  store_id: string;
  customer_id?: string;
  cashier_id?: string;
  total: number;
  subtotal: number;
  tax: number;
  tax_amount?: number;
  discount: number;
  discount_amount?: number;
  discountType?: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo';
  payment_method: string;
  paymentMethod?: string; // Legacy compatibility
  paymentDetails?: {
    cardType?: string;
    cardNumber?: string;
    eWalletProvider?: string;
    eWalletReferenceNumber?: string;
  };
  amountTendered?: number;
  change?: number;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  receiptNumber: string;
  receipt_number?: string; // Database compatibility
  items: TransactionItem[];
  created_at: string;
  createdAt?: string; // Legacy compatibility
  updated_at: string;
}

export interface Shift {
  id: string;
  userId: string;
  user_id?: string; // Database compatibility
  storeId: string;
  store_id?: string; // Database compatibility
  startTime: string;
  start_time?: string; // Database compatibility
  endTime?: string;
  end_time?: string; // Database compatibility
  startingCash: number;
  starting_cash?: number; // Database compatibility
  endingCash?: number;
  ending_cash?: number; // Database compatibility
  status: 'active' | 'closed';
  startPhoto?: string;
  start_photo?: string; // Database compatibility
  endPhoto?: string;
  end_photo?: string; // Database compatibility
  startInventoryCount?: Record<string, number>;
  start_inventory_count?: Record<string, number>; // Database compatibility
  endInventoryCount?: Record<string, number>;
  end_inventory_count?: Record<string, number>; // Database compatibility
  cashier_id?: string;
}

export interface InventoryStock {
  id: string;
  store_id: string;
  item: string;
  unit: string;
  stock_quantity: number;
  cost?: number;
  minimum_threshold?: number;
  maximum_capacity?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// User interface for auth context
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name?: string; // Computed from firstName + lastName
  role: UserRole;
  storeIds: string[];
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

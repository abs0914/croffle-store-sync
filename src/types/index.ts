
export type UserRole = 'admin' | 'owner' | 'manager' | 'cashier' | 'staff';

// Shift type alias
export type ShiftType = Shift;

// Product size type
export type ProductSize = 'regular' | 'mini' | 'croffle-overload';

// Recipe types
export interface Recipe {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  store_id: string;
  yield_quantity: number;
  total_cost?: number;
  cost_per_serving?: number;
  approval_status?: string;
  approved_by?: string;
  approved_at?: string;
  product_id: string;
  variation_id?: string;
  version?: number;
  is_active?: boolean;
  category_name?: string;
  created_at: string;
  updated_at: string;
  rejection_reason?: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  inventory_stock_id: string;
  commissary_item_id?: string;
  quantity: number;
  unit: string;
  cost_per_unit?: number;
  created_at: string;
}

// Ingredient type for inventory management
export interface Ingredient {
  id: string;
  name: string;
  unit_type: string; // Changed from unit to unit_type
  stock_quantity: number;
  cost_per_unit: number; // Added cost_per_unit
  minimum_threshold?: number;
  store_id: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  // Legacy compatibility
  unit?: string;
  cost?: number;
}

// Use the Store interface from types/store.ts to avoid conflicts
export interface Store {
  id: string;
  name: string;
  address: string;
  location: string;
  city?: string;
  country?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  ownership_type?: 'company_owned' | 'franchisee';
  franchise_fee_percentage?: number;
  franchise_agreement_date?: string;
  franchisee_contact_info?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  vat_rate?: number;
  currency?: string;
  receipt_footer?: string;
  receipt_header?: string;
  // Additional properties for admin components
  location_type?: string;
  region?: string;
  logistics_zone?: string;
  tax_id?: string;
  logo_url?: string;
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
  // Legacy/compatibility properties
  stockQuantity?: number;
  categoryId?: string;
  variations?: ProductVariation[];
  product_variations?: ProductVariation[];
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
  // Legacy compatibility
  isActive?: boolean;
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
  receiptNumber: string;
  receipt_number: string;
  customer_id?: string;
  store_id: string;
  total: number;
  subtotal: number;
  tax_amount: number;
  discount: number;
  payment_method: string;
  status: 'pending' | 'completed' | 'cancelled';
  items: any[];
  created_at: string;
  updated_at: string;
  customers?: {
    name: string;
  };
  stores?: {
    name: string;
  };
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

export interface CustomerMetrics {
  totalCustomers: number;
  activeCustomers: number;
  newThisMonth: number;
  averageOrderValue: number;
  newCustomers: number;
  topStoreCustomers: number;
  averageLifetimeValue: number;
}

export interface CustomerWithStats extends Customer {
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
  registrationDate: string;
}

export interface StoreMetrics {
  totalStores: number;
  activeStores: number;
  inactiveStores: number;
  companyOwned: number;
  franchises: number;
  averagePerformance: number;
  alertsCount: number;
}

export interface ReportMetrics {
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  topSellingProduct: string;
  revenueGrowth: number;
  topPerformingStore: string;
  growthRate: number;
}

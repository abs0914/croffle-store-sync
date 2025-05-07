export type UserRole = 'admin' | 'owner' | 'manager' | 'cashier';

// Add Session type for auth context
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

export interface Store {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  tax_id?: string;
  is_active: boolean;
  logo_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category_id?: string;
  categoryId?: string; // For frontend compatibility
  image_url?: string;
  image?: string; // For frontend compatibility
  is_active: boolean;
  isActive?: boolean; // For frontend compatibility
  variations?: ProductVariation[];
  store_id?: string;
  storeId?: string; // For frontend compatibility
  sku: string;
  barcode?: string;
  cost?: number;
  stock_quantity: number;
  stockQuantity?: number; // For frontend compatibility
  recipe?: Recipe; // Optional recipe connection
}

export type ProductSize = 'regular' | 'mini';

export interface ProductVariation {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  isActive?: boolean; // For frontend compatibility
  stock_quantity: number;
  stockQuantity?: number; // For frontend compatibility
  product_id: string;
  productId?: string; // For frontend compatibility
  sku: string;
  size?: ProductSize; // Add size field
  recipe?: Recipe; // Optional recipe connection
}

// New interface for ingredients/raw materials
export interface Ingredient {
  id: string;
  name: string;
  unit_type: 'pieces' | 'portion' | 'serving' | 'scoop' | 'grams' | 'milliliters';
  store_id: string;
  stock_quantity: number;
  cost_per_unit?: number;
  category_id?: string;
  sku?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// New interface for recipes that connect products to ingredients
export interface Recipe {
  id: string;
  product_id: string;
  variation_id?: string;
  ingredients: RecipeIngredient[];
  store_id: string;
  created_at?: string;
  updated_at?: string;
}

// Ingredient with quantity for recipes
export interface RecipeIngredient {
  ingredient_id: string;
  ingredient_name?: string;
  quantity: number;
  unit_type?: string;
  cost_per_unit?: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  image?: string; // For frontend compatibility
  is_active: boolean;
  isActive?: boolean; // For frontend compatibility
  store_id?: string;
  storeId?: string; // For frontend compatibility
}

export interface CartItem {
  productId: string;
  product: Product;
  variationId?: string;
  variation?: ProductVariation;
  quantity: number;
  notes?: string;
  price: number;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  loyaltyPoints?: number;
}

export interface Shift {
  id: string;
  userId: string;
  storeId: string;
  startTime: string;
  endTime?: string;
  startingCash: number;
  endingCash?: number;
  status: 'active' | 'closed';
}

export interface Transaction {
  id: string;
  shiftId: string;
  storeId: string;
  userId: string;
  customerId?: string;
  items: TransactionItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'other';
  status: 'completed' | 'voided';
  createdAt: string;
  receiptNumber: string;
}

export interface TransactionItem {
  productId: string;
  variationId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface StoreSettings {
  id: string;
  storeId: string;
  receiptHeader: string;
  receiptFooter: string;
  taxPercentage: number;
  isTaxInclusive: boolean;
  currency: string;
  timezone: string;
}

export interface InventoryStock {
  id: string;
  store_id: string;
  item: string;
  unit: string;
  stock_quantity: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

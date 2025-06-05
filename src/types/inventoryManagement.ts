
export interface InventoryItem {
  id: string;
  store_id: string;
  name: string;
  category: 'ingredients' | 'packaging' | 'supplies';
  current_stock: number;
  minimum_threshold: number;
  unit: 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs';
  unit_cost?: number;
  supplier_id?: string;
  sku?: string;
  barcode?: string;
  expiry_date?: string;
  last_updated: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  lead_time_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Recipe {
  id: string;
  product_id: string;
  variation_id?: string;
  store_id: string;
  name: string;
  description?: string;
  yield_quantity: number;
  instructions?: string;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  ingredients: RecipeIngredient[];
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  inventory_item_id: string;
  quantity: number;
  unit: 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs';
  created_at: string;
  inventory_item?: InventoryItem;
}

export interface StockTransaction {
  id: string;
  inventory_item_id: string;
  transaction_type: string;
  quantity_change: number;
  previous_stock: number;
  new_stock: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface Order {
  id: string;
  store_id: string;
  supplier_id: string;
  order_number: string;
  status: 'draft' | 'pending' | 'approved' | 'ordered' | 'delivered' | 'received' | 'cancelled';
  total_amount: number;
  created_by: string;
  approved_by?: string;
  ordered_date?: string;
  expected_delivery_date?: string;
  received_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  inventory_item_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  received_quantity: number;
  created_at: string;
  inventory_item?: InventoryItem;
}

export type StockLevel = 'good' | 'low' | 'out';

export interface InventoryFilters {
  category?: 'ingredients' | 'packaging' | 'supplies' | 'all';
  stockLevel?: StockLevel | 'all';
  supplier?: string;
  search?: string;
}

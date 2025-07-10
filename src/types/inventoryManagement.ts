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
  name: string;
  description?: string;
  instructions?: string;
  yield_quantity: number;
  serving_size?: number;
  store_id: string;
  product_id: string;
  variation_id?: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  category_name?: string;
  total_cost?: number;
  cost_per_serving?: number;
  approval_status?: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  ingredients?: RecipeIngredient[];
  stores?: { name: string };
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
  inventory_stock?: {
    id: string;
    item: string;
    unit: string;
    cost?: number;
    stock_quantity: number;
  };
}

export interface InventoryStock {
  id: string;
  item: string;
  unit: string;
  cost: number;
  store_id: string;
  stock_quantity: number;
  sku?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // New bulk-to-serving fields
  bulk_unit?: string;
  bulk_quantity?: number;
  serving_unit?: string;
  serving_quantity?: number;
  breakdown_ratio?: number;
  cost_per_serving?: number;
  fractional_stock?: number;
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

// Updated Commissary Inventory Types to match commissary.ts
export interface CommissaryInventoryItem {
  id: string;
  name: string;
  category: 'raw_materials' | 'packaging_materials' | 'supplies';
  item_type: 'raw_material' | 'supply' | 'orderable_item';
  current_stock: number;
  minimum_threshold: number;
  uom: string;
  unit_cost?: number;
  supplier_id?: string;
  sku?: string;
  barcode?: string;
  expiry_date?: string;
  storage_location?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
}

// Enhanced Conversion Recipe Types (for defining how multiple raw materials become finished goods)
export interface ConversionRecipe {
  id: string;
  name: string;
  description?: string;
  finished_item_name: string;
  finished_item_unit: string;
  yield_quantity: number;
  instructions?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  ingredients?: ConversionRecipeIngredient[];
}

export interface ConversionRecipeIngredient {
  id: string;
  conversion_recipe_id: string;
  commissary_item_id: string;
  quantity: number;
  created_at: string;
  commissary_item?: CommissaryInventoryItem;
}

// Enhanced Inventory Conversion Types
export interface InventoryConversion {
  id: string;
  conversion_recipe_id?: string;
  store_id: string;
  inventory_stock_id: string;
  finished_goods_quantity: number;
  conversion_date: string;
  converted_by: string;
  notes?: string;
  created_at: string;
  conversion_recipe?: ConversionRecipe;
  inventory_stock?: InventoryStock;
  ingredients?: ConversionIngredient[];
}

export interface ConversionIngredient {
  id: string;
  inventory_conversion_id: string;
  commissary_item_id: string;
  quantity_used: number;
  unit_cost?: number;
  created_at: string;
  commissary_item?: CommissaryInventoryItem;
}

// Form types for multi-ingredient conversions
export interface MultiIngredientConversionForm {
  conversion_recipe_id?: string;
  ingredients: ConversionIngredientForm[];
  inventory_stock_id: string;
  new_item_name: string;
  new_item_unit: string;
  finished_goods_quantity: number;
  notes: string;
}

export interface ConversionIngredientForm {
  commissary_item_id: string;
  quantity: number;
  available_stock: number;
  unit_cost?: number;
}

// Recipe creation form
export interface ConversionRecipeForm {
  name: string;
  description: string;
  finished_item_name: string;
  finished_item_unit: string;
  yield_quantity: number;
  instructions: string;
  ingredients: ConversionRecipeIngredientForm[];
}

export interface ConversionRecipeIngredientForm {
  commissary_item_id: string;
  quantity: number;
}

// Simplified filters for commissary inventory - removed redundant category filter
export interface CommissaryInventoryFilters {
  stockLevel?: 'all' | 'good' | 'low' | 'out';  
  supplier?: string;
  search?: string;
  item_type?: 'all' | 'raw_material' | 'orderable_item'; // Simplified to just raw materials and finished products
}

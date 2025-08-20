
export type InventoryItemCategory = 
  | 'base_ingredient'
  | 'classic_sauce' 
  | 'premium_sauce'
  | 'classic_topping'
  | 'premium_topping'
  | 'packaging'
  | 'biscuit';

export interface InventoryStock {
  id: string;
  item: string;
  unit: string;
  stock_quantity: number;
  minimum_threshold?: number;
  maximum_capacity?: number;
  cost?: number;
  sku?: string;
  store_id: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  last_restocked?: string;
  item_category?: InventoryItemCategory;
  // New bulk-to-serving fields
  bulk_unit?: string;
  bulk_quantity?: number;
  serving_unit?: string;
  serving_quantity?: number;
  breakdown_ratio?: number;
  cost_per_serving?: number;
  fractional_stock?: number;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  supplier?: string;
  category?: string;
  unit_type?: string; // Legacy/compatibility property, maps to unit
  stock_quantity?: number;
  is_active?: boolean;
  store_id?: string;
  created_at?: string;
  updated_at?: string;
}

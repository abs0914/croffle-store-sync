
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
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  supplier?: string;
  category?: string;
  unit_type?: string;
  stock_quantity?: number;
  is_active?: boolean;
}

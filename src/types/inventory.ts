
export interface InventoryStock {
  id: string;
  store_id: string;
  item: string;
  sku?: string;
  unit: string;
  stock_quantity: number;
  cost?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

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

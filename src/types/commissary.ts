
export interface CommissaryInventoryItem {
  id: string;
  name: string;
  category: 'raw_materials' | 'packaging_materials' | 'supplies';
  current_stock: number;
  minimum_threshold: number;
  unit: 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs' | 'serving' | 'portion' | 'scoop' | 'pair';
  unit_cost?: number;
  supplier_id?: string;
  sku?: string;
  barcode?: string;
  expiry_date?: string;
  storage_location?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecipeUpload {
  name: string;
  description?: string;
  yield_quantity: number;
  serving_size: number;
  instructions?: string;
  ingredients: RecipeIngredientUpload[];
}

export interface RecipeIngredientUpload {
  commissary_item_name: string;
  quantity: number;
  unit: string;
  cost_per_unit?: number;
}

export interface RawIngredientUpload {
  name: string;
  category: 'raw_materials' | 'packaging_materials' | 'supplies';
  unit: 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs' | 'serving' | 'portion' | 'scoop' | 'pair';
  unit_cost?: number;
  current_stock?: number;
  minimum_threshold?: number;
  supplier_name?: string;
  sku?: string;
  storage_location?: string;
}


// Standard UOM options for consistency across the application
export const STANDARD_UOM_OPTIONS = [
  'kg', 'g', 'pieces', 'liters', 'ml', 'boxes', 'packs', 'serving', 'portion', 'scoop', 'pair'
] as const;

// Commissary inventory item interface
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
  supplier?: {
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
  };
}

// Recipe upload types
export interface RecipeUpload {
  name: string;
  description?: string;
  category?: string;
  instructions?: string;
  yield_quantity: number;
  serving_size?: number;
  ingredients: RecipeIngredientUpload[];
}

export interface RecipeIngredientUpload {
  commissary_item_name: string;
  quantity: number;
  uom: string;
  cost_per_unit?: number;
}

// Raw ingredient upload interface
export interface RawIngredientUpload {
  name: string;
  category: 'raw_materials' | 'packaging_materials' | 'supplies';
  uom: string;
  unit_cost?: number;
  current_stock?: number;
  minimum_threshold?: number;
  supplier_name?: string;
  sku?: string;
  storage_location?: string;
}

// Commissary conversion types
export interface ConversionInputItem {
  commissary_item_id: string;
  quantity: number;
  unit: string;
}

export interface ConversionOutputItem {
  name: string;
  quantity: number;
  uom: string;
  category: string;
  unit_cost?: number;
  sku?: string;
  storage_location?: string;
}

export interface ConversionRequest {
  name: string;
  description?: string;
  input_items: ConversionInputItem[];
  output_item: ConversionOutputItem;
}

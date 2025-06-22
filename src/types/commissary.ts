
export interface CommissaryInventoryItem {
  id: string;
  name: string;
  category: 'raw_materials' | 'packaging_materials' | 'supplies';
  item_type: 'raw_material' | 'supply' | 'orderable_item';
  current_stock: number;
  minimum_threshold: number;
  uom: string; // Changed from unit to uom and made it a string to support custom UOMs
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
  category?: string;
  description?: string;
  yield_quantity: number;
  serving_size: number;
  instructions?: string;
  ingredients: RecipeIngredientUpload[];
}

export interface RecipeIngredientUpload {
  commissary_item_name: string;
  quantity: number;
  uom: string; // Changed from unit to uom
  cost_per_unit?: number;
}

export interface RawIngredientUpload {
  name: string;
  category: 'raw_materials' | 'packaging_materials' | 'supplies';
  uom: string; // Changed from unit to uom
  unit_cost?: number;
  current_stock?: number;
  minimum_threshold?: number;
  supplier_name?: string;
  sku?: string;
  storage_location?: string;
}

export interface ConversionRequest {
  name: string;
  description?: string;
  input_items: {
    commissary_item_id: string;
    quantity: number;
  }[];
  output_item: {
    name: string;
    category: 'raw_materials' | 'packaging_materials' | 'supplies';
    uom: string;
    quantity: number;
    unit_cost?: number;
    sku?: string;
    storage_location?: string;
  };
}

// Standard UOM options
export const STANDARD_UOM_OPTIONS = [
  '1 Box',
  '1 Kilo',
  '1 Liter',
  '900 grams',
  '2500 grams',
  '5000 grams',
  '1000 grams',
  '750 grams',
  '454 grams',
  '500 grams',
  '680 grams',
  '6000 grams',
  '630 grams',
  'Piece',
  'Pack of 25',
  'Pack of 50',
  'Pack of 100',
  'Pack of 20',
  'Pack of 32',
  'Pack of 24',
  'Pack of 27'
];

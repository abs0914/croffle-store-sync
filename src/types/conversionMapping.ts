
export interface ConversionMapping {
  id: string;
  inventory_stock_id: string;
  recipe_ingredient_name: string;
  recipe_ingredient_unit: string;
  conversion_factor: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  inventory_stock?: {
    id: string;
    item: string;
    unit: string;
    stock_quantity: number;
    fractional_stock: number;
    store_id: string;
  };
}

export interface ConversionMappingInput {
  inventory_stock_id: string;
  recipe_ingredient_name: string;
  recipe_ingredient_unit: string;
  conversion_factor: number;
  notes?: string;
}

export interface InventoryDeductionRequest {
  recipe_ingredient_name: string;
  recipe_ingredient_unit: string;
  quantity: number;
  store_id: string;
}

export interface InventoryDeductionResult {
  success: boolean;
  inventory_stock_id?: string;
  deducted_quantity: number;
  remaining_stock: number;
  remaining_fractional_stock: number;
  error?: string;
}

export interface AvailabilityCheck {
  recipe_ingredient_name: string;
  recipe_ingredient_unit: string;
  required_quantity: number;
  available_quantity: number;
  is_sufficient: boolean;
  inventory_stock_id?: string;
}

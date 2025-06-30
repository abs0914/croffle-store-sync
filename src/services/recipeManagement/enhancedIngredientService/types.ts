
export interface EnhancedRecipeIngredient {
  id?: string;
  ingredient_name: string;
  recipe_unit: string;
  purchase_unit?: string;
  quantity: number;
  conversion_factor?: number;
  cost_per_unit?: number;
  cost_per_recipe_unit?: number;
  bulk_inventory_item?: string;
  commissary_item_id?: string;
}

export interface BulkInventoryMapping {
  recipe_ingredient_name: string;
  bulk_item_name: string;
  bulk_item_id: string;
  conversion_factor: number;
  recipe_unit: string;
  bulk_unit: string;
}

export interface InventoryDeductionRequirement {
  inventory_stock_id: string;
  item_name: string;
  deduction_quantity: number;
  unit: string;
}

// Define valid unit types based on the database enum
export type ValidUnit = 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs';

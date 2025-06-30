
export interface RecipeTemplate {
  id: string;
  name: string;
  description?: string;
  category_name?: string;
  instructions?: string;
  yield_quantity: number;
  serving_size?: number;
  version: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  image_url?: string;
  ingredients: RecipeTemplateIngredient[];
}

export interface RecipeTemplateIngredient {
  id: string;
  recipe_template_id: string;
  ingredient_name: string;
  ingredient_category: string;
  ingredient_type: string;
  quantity: number;
  unit: string;
  created_at: string;
  // Optional commissary references for backward compatibility
  commissary_item_id?: string;
  commissary_item_name?: string;
  cost_per_unit?: number;
}

// Enhanced interface for ingredient input in templates with cost fields
export interface RecipeTemplateIngredientInput {
  ingredient_name: string;
  ingredient_category: string;
  ingredient_type: string;
  quantity: number;
  unit: string;
  cost_per_unit?: number;
  purchase_unit?: string;
  conversion_factor?: number;
}

// Available ingredient categories and types
export const INGREDIENT_CATEGORIES = [
  'ingredient',
  'spice', 
  'sauce',
  'topping',
  'base',
  'packaging'
] as const;

export const INGREDIENT_TYPES = [
  'raw_material',
  'finished_good', 
  'packaging',
  'consumable'
] as const;

export type IngredientCategory = typeof INGREDIENT_CATEGORIES[number];
export type IngredientType = typeof INGREDIENT_TYPES[number];

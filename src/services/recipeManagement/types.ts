
export type LocationType = 'all' | 'inside_cebu' | 'outside_cebu';

export interface RecipeTemplate {
  id: string;
  name: string;
  description?: string;
  category_name?: string;
  instructions?: string;
  yield_quantity: number;
  serving_size?: number;
  image_url?: string;
  created_by: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  ingredients: RecipeTemplateIngredient[];
}

export interface RecipeTemplateIngredient {
  id?: string;
  recipe_template_id?: string;
  ingredient_name: string;
  commissary_item_name?: string;
  commissary_item_id?: string;
  ingredient_category: string;
  ingredient_type: string;
  quantity: number;
  unit: string;
  cost_per_unit?: number;
  purchase_unit?: string;
  recipe_unit?: string;
  conversion_factor?: number;
  cost_per_recipe_unit?: number;
  location_type: LocationType;
  created_at?: string;
}

export interface RecipeTemplateIngredientInput {
  ingredient_name: string;
  ingredient_category: string;
  ingredient_type: string;
  quantity: number;
  unit: string;
  cost_per_unit?: number;
  purchase_unit?: string;
  conversion_factor?: number;
  location_type: LocationType;
}

export interface LocationBasedIngredientSet {
  location_type: LocationType;
  ingredients: RecipeTemplateIngredientInput[];
}

export const INGREDIENT_CATEGORIES = [
  'ingredient',
  'spice',
  'dairy',
  'meat',
  'vegetable',
  'fruit',
  'grain',
  'liquid',
  'sauce',
  'seasoning'
];

export const INGREDIENT_TYPES = [
  'raw_material',
  'processed',
  'finished_product',
  'semi_finished'
];

export const LOCATION_TYPES: { value: LocationType; label: string }[] = [
  { value: 'all', label: 'All Locations' },
  { value: 'inside_cebu', label: 'Inside Cebu' },
  { value: 'outside_cebu', label: 'Outside Cebu' }
];

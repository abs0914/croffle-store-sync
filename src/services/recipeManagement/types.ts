
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
  commissary_item_id: string;
  commissary_item_name: string;
  quantity: number;
  unit: string;
  cost_per_unit?: number;
  created_at: string;
}

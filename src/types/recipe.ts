
export interface Recipe {
  id: string;
  product_id: string;
  variation_id?: string;
  ingredients: RecipeIngredient[];
  store_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface RecipeIngredient {
  ingredient_id: string;
  ingredient_name?: string;
  quantity: number;
  unit_type?: string;
  cost_per_unit?: number;
}

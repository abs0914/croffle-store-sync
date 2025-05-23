
// Recipe type definitions
export interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientId: string;
  ingredient_id?: string; // For backward compatibility
  quantity: number;
  unit: string;
  unit_type?: string; // For backward compatibility
  cost_per_unit?: number; // For backward compatibility
  ingredient_name?: string; // For backward compatibility
}

export interface Recipe {
  id: string;
  productId: string;
  product_id?: string; // For backward compatibility
  variation_id?: string; // For backward compatibility
  store_id?: string; // For backward compatibility
  name: string;
  instructions: string;
  ingredients: RecipeIngredient[];
  createdAt: string;
  updatedAt: string;
  created_at?: string; // For backward compatibility
  updated_at?: string; // For backward compatibility
}

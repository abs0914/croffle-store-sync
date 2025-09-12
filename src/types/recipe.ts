
// Recipe type definitions
export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  inventory_stock_id: string; // Required FK to inventory_stock
  quantity: number;
  unit: string;
  cost_per_unit?: number;
  created_at?: string;
  updated_at?: string;
  // Computed fields for backward compatibility
  ingredient_name?: string; // Derived from inventory_stock.item via JOIN
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

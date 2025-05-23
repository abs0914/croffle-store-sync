
// Recipe type definitions
export interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientId: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  productId: string;
  name: string;
  instructions: string;
  ingredients: RecipeIngredient[];
  createdAt: string;
  updatedAt: string;
}

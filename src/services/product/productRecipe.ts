
import { Recipe, RecipeIngredient } from "@/types";

// Mock implementation since the real recipe tables don't exist yet
// Just returning dummy data for now to make TypeScript happy

// Helper function to calculate product cost based on recipe ingredients
export const calculateProductCostFromRecipe = (recipe: Recipe): number => {
  if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
    return 0;
  }
  
  return recipe.ingredients.reduce((total, ingredient) => {
    // If we have cost information in the ingredient record
    if (ingredient.cost_per_unit !== undefined) {
      return total + (ingredient.cost_per_unit * ingredient.quantity);
    }
    return total;
  }, 0);
};

// Helper function to check if two recipes are equal
export const areRecipesEqual = (recipe1: Recipe | null, recipe2: Recipe | null): boolean => {
  if (!recipe1 && !recipe2) return true;
  if (!recipe1 || !recipe2) return false;
  
  if (recipe1.ingredients.length !== recipe2.ingredients.length) {
    return false;
  }
  
  const sortedIngredients1 = [...recipe1.ingredients].sort((a, b) => 
    a.ingredient_id.localeCompare(b.ingredient_id)
  );
  
  const sortedIngredients2 = [...recipe2.ingredients].sort((a, b) => 
    a.ingredient_id.localeCompare(b.ingredient_id)
  );
  
  for (let i = 0; i < sortedIngredients1.length; i++) {
    if (sortedIngredients1[i].ingredient_id !== sortedIngredients2[i].ingredient_id ||
        sortedIngredients1[i].quantity !== sortedIngredients2[i].quantity) {
      return false;
    }
  }
  
  return true;
};

// Mock recipe service functions until the database tables are created
export const fetchRecipe = async (productId: string, variationId?: string): Promise<Recipe | null> => {
  console.log("Mocked fetchRecipe called for product:", productId, "variation:", variationId);
  return null; // Return null as if no recipe exists yet
};

export const saveRecipe = async (recipe: Omit<Recipe, "id" | "created_at" | "updated_at">): Promise<Recipe | null> => {
  console.log("Mocked saveRecipe called with:", recipe);
  return null; // Mock implementation
};

export const deleteRecipe = async (productId: string, variationId?: string): Promise<boolean> => {
  console.log("Mocked deleteRecipe called for product:", productId, "variation:", variationId);
  return true; // Mock implementation always returns success
};

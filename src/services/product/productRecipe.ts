
import { Recipe, RecipeIngredient } from "@/types";
import { fetchRecipe, saveRecipe, deleteRecipe } from "@/services/recipeService";

// Re-export the recipe functions for product usage
export { fetchRecipe, saveRecipe, deleteRecipe };

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


import { supabase } from "@/integrations/supabase/client";
import { Recipe, RecipeIngredient } from "@/types";
import { toast } from "sonner";
import { calculateProductCostFromRecipe, areRecipesEqual } from "./product/productRecipe";

export { calculateProductCostFromRecipe, areRecipesEqual };

// Fetch a recipe for a product or variation
export const fetchRecipe = async (productId: string, variationId?: string): Promise<Recipe | null> => {
  try {
    console.log(`Fetching recipe for product: ${productId}, variation: ${variationId || 'none'}`);
    
    // For development, return null as recipes table doesn't exist yet
    console.log("Recipes table not available yet, returning null");
    return null;
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return null; // Don't show a toast for recipe fetch errors
  }
};

// Save or update a recipe
export const saveRecipe = async (recipe: Omit<Recipe, "id" | "created_at" | "updated_at">): Promise<Recipe | null> => {
  try {
    console.log("Saving recipe:", recipe);
    
    // For development, show a toast but act like it succeeded
    console.log("Recipes table not available yet");
    toast.warning("Recipe data will be available when the recipes database is set up");
    
    // Return mock data as if the recipe was saved
    return {
      id: "pending-recipe-id",
      product_id: recipe.product_id,
      variation_id: recipe.variation_id,
      ingredients: recipe.ingredients,
      store_id: recipe.store_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error saving recipe:", error);
    toast.error("Failed to save recipe");
    return null;
  }
};

// Delete a recipe
export const deleteRecipe = async (productId: string, variationId?: string): Promise<boolean> => {
  try {
    console.log(`Deleting recipe for product: ${productId}, variation: ${variationId || 'none'}`);
    
    // For development, show success since there's nothing to delete
    console.log("Recipes table not available yet");
    toast.success("No recipe data to delete");
    return true;
  } catch (error) {
    console.error("Error deleting recipe:", error);
    toast.error("Failed to delete recipe");
    return false;
  }
};

// Calculate the cost of a recipe based on ingredient costs
export const calculateRecipeCost = async (recipeId: string): Promise<number> => {
  try {
    console.log(`Calculating cost for recipe: ${recipeId}`);
    
    // For development, return a default value
    return 0;
  } catch (error) {
    console.error("Error calculating recipe cost:", error);
    return 0;
  }
};


import { supabase } from "@/integrations/supabase/client";
import { Recipe, RecipeIngredient } from "@/types";
import { toast } from "sonner";
import { calculateProductCostFromRecipe, areRecipesEqual } from "./product/productRecipe";

export { calculateProductCostFromRecipe, areRecipesEqual };

// Fetch a recipe for a product or variation
export const fetchRecipe = async (productId: string, variationId?: string): Promise<Recipe | null> => {
  try {
    console.log(`Fetching recipe for product: ${productId}, variation: ${variationId || 'none'}`);
    
    // First check if we have recipes table available
    const { error: tableCheckError } = await supabase
      .from('recipes')
      .select('id')
      .limit(1);
    
    // If table doesn't exist yet, return mock data for development
    if (tableCheckError) {
      console.log("Recipes table not available yet, returning null");
      return null;
    }
    
    // Query for recipe
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        id, 
        product_id,
        variation_id,
        store_id,
        created_at,
        updated_at,
        ingredients
      `)
      .eq('product_id', productId)
      .eq(variationId ? 'variation_id' : 'is_null', variationId || true)
      .maybeSingle();
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return null; // Don't show a toast for recipe fetch errors
  }
};

// Save or update a recipe
export const saveRecipe = async (recipe: Omit<Recipe, "id" | "created_at" | "updated_at">): Promise<Recipe | null> => {
  try {
    console.log("Saving recipe:", recipe);
    
    // First check if we have recipes table available
    const { error: tableCheckError } = await supabase
      .from('recipes')
      .select('id')
      .limit(1);
    
    // If table doesn't exist yet, show a toast but act like it succeeded
    if (tableCheckError) {
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
    }
    
    // Check if recipe already exists to update it
    const { data: existingRecipe } = await supabase
      .from('recipes')
      .select('id')
      .eq('product_id', recipe.product_id)
      .eq(recipe.variation_id ? 'variation_id' : 'is_null', recipe.variation_id || true)
      .maybeSingle();
    
    let result;
    
    if (existingRecipe) {
      // Update existing recipe
      const { data, error } = await supabase
        .from('recipes')
        .update({
          ingredients: recipe.ingredients,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRecipe.id)
        .select()
        .single();
        
      if (error) throw error;
      result = data;
      toast.success("Recipe updated successfully");
    } else {
      // Create new recipe
      const { data, error } = await supabase
        .from('recipes')
        .insert({
          product_id: recipe.product_id,
          variation_id: recipe.variation_id,
          ingredients: recipe.ingredients,
          store_id: recipe.store_id
        })
        .select()
        .single();
        
      if (error) throw error;
      result = data;
      toast.success("Recipe saved successfully");
    }
    
    return result;
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
    
    // First check if we have recipes table available
    const { error: tableCheckError } = await supabase
      .from('recipes')
      .select('id')
      .limit(1);
    
    // If table doesn't exist yet, show success since there's nothing to delete
    if (tableCheckError) {
      console.log("Recipes table not available yet");
      toast.success("No recipe data to delete");
      return true;
    }
    
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('product_id', productId)
      .eq(variationId ? 'variation_id' : 'is_null', variationId || true);
      
    if (error) throw error;
    
    toast.success("Recipe deleted successfully");
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
    
    // First check if we have recipes table available
    const { error: tableCheckError } = await supabase
      .from('recipes')
      .select('id')
      .limit(1);
    
    // If table doesn't exist yet, return a default value
    if (tableCheckError) {
      return 0;
    }
    
    // Get recipe data
    const { data: recipe, error } = await supabase
      .from('recipes')
      .select('ingredients')
      .eq('id', recipeId)
      .single();
      
    if (error) throw error;
    
    if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
      return 0;
    }
    
    // Calculate cost based on ingredients
    let totalCost = 0;
    for (const ingredient of recipe.ingredients) {
      if (ingredient.cost_per_unit && ingredient.quantity) {
        totalCost += ingredient.cost_per_unit * ingredient.quantity;
      }
    }
    
    return totalCost;
  } catch (error) {
    console.error("Error calculating recipe cost:", error);
    return 0;
  }
};

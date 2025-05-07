
import { supabase } from "@/integrations/supabase/client";
import { Recipe, RecipeIngredient } from "@/types";
import { toast } from "sonner";

// Fetch a recipe for a product or variation
export const fetchRecipe = async (productId: string, variationId?: string): Promise<Recipe | null> => {
  try {
    let query = supabase
      .from("recipes")
      .select(`
        *,
        recipe_ingredients:recipe_ingredients(
          *,
          ingredients:ingredient_id(name, unit_type)
        )
      `)
      .eq("product_id", productId);
    
    if (variationId) {
      query = query.eq("variation_id", variationId);
    } else {
      query = query.is("variation_id", null);
    }
    
    const { data, error } = await query.single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No recipe found
        return null;
      }
      throw new Error(error.message);
    }
    
    // Transform the data to match our Recipe interface
    const recipeIngredients: RecipeIngredient[] = data.recipe_ingredients.map((item: any) => ({
      ingredient_id: item.ingredient_id,
      ingredient_name: item.ingredients?.name,
      quantity: item.quantity,
      unit_type: item.ingredients?.unit_type
    }));
    
    return {
      id: data.id,
      product_id: data.product_id,
      variation_id: data.variation_id || undefined,
      ingredients: recipeIngredients,
      store_id: data.store_id,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return null; // Don't show a toast for recipe fetch errors
  }
};

// Save or update a recipe
export const saveRecipe = async (recipe: Omit<Recipe, "id" | "created_at" | "updated_at">): Promise<Recipe | null> => {
  try {
    // First, check if a recipe already exists
    let query = supabase
      .from("recipes")
      .select("id")
      .eq("product_id", recipe.product_id);
    
    if (recipe.variation_id) {
      query = query.eq("variation_id", recipe.variation_id);
    } else {
      query = query.is("variation_id", null);
    }
    
    const { data: existingRecipe, error: checkError } = await query.maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(checkError.message);
    }
    
    let recipeId: string;
    
    if (existingRecipe) {
      // Update existing recipe
      const { error: updateError } = await supabase
        .from("recipes")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", existingRecipe.id);
      
      if (updateError) {
        throw new Error(updateError.message);
      }
      
      recipeId = existingRecipe.id;
      
      // Delete existing recipe ingredients
      const { error: deleteError } = await supabase
        .from("recipe_ingredients")
        .delete()
        .eq("recipe_id", recipeId);
      
      if (deleteError) {
        throw new Error(deleteError.message);
      }
    } else {
      // Create new recipe
      const { data: newRecipe, error: insertError } = await supabase
        .from("recipes")
        .insert({
          product_id: recipe.product_id,
          variation_id: recipe.variation_id || null,
          store_id: recipe.store_id
        })
        .select("id")
        .single();
      
      if (insertError) {
        throw new Error(insertError.message);
      }
      
      recipeId = newRecipe.id;
    }
    
    // Insert recipe ingredients
    if (recipe.ingredients.length > 0) {
      const recipeIngredients = recipe.ingredients.map(ingredient => ({
        recipe_id: recipeId,
        ingredient_id: ingredient.ingredient_id,
        quantity: ingredient.quantity
      }));
      
      const { error: ingredientsError } = await supabase
        .from("recipe_ingredients")
        .insert(recipeIngredients);
      
      if (ingredientsError) {
        throw new Error(ingredientsError.message);
      }
    }
    
    toast.success("Recipe saved successfully");
    
    // Return the updated recipe
    return fetchRecipe(recipe.product_id, recipe.variation_id);
  } catch (error) {
    console.error("Error saving recipe:", error);
    toast.error("Failed to save recipe");
    return null;
  }
};

// Delete a recipe
export const deleteRecipe = async (productId: string, variationId?: string): Promise<boolean> => {
  try {
    let query = supabase
      .from("recipes")
      .delete()
      .eq("product_id", productId);
    
    if (variationId) {
      query = query.eq("variation_id", variationId);
    } else {
      query = query.is("variation_id", null);
    }
    
    const { error } = await query;
    
    if (error) {
      throw new Error(error.message);
    }
    
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
    const { data, error } = await supabase
      .rpc('calculate_recipe_cost', { recipe_id: recipeId });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data || 0;
  } catch (error) {
    console.error("Error calculating recipe cost:", error);
    return 0;
  }
};

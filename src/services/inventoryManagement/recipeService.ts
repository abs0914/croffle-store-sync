
import { supabase } from "@/integrations/supabase/client";
import { Recipe, RecipeIngredient, InventoryStock } from "@/types/inventoryManagement";
import { toast } from "sonner";

export const fetchRecipes = async (storeId: string): Promise<Recipe[]> => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        *,
        ingredients:recipe_ingredients(
          *,
          inventory_stock:inventory_stock(*)
        )
      `)
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching recipes:', error);
    toast.error('Failed to fetch recipes');
    return [];
  }
};

export const createRecipe = async (recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at' | 'ingredients'>): Promise<Recipe | null> => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .insert(recipe)
      .select(`
        *,
        ingredients:recipe_ingredients(
          *,
          inventory_stock:inventory_stock(*)
        )
      `)
      .single();

    if (error) throw error;

    toast.success('Recipe created successfully');
    return data;
  } catch (error) {
    console.error('Error creating recipe:', error);
    toast.error('Failed to create recipe');
    return null;
  }
};

export const updateRecipe = async (id: string, updates: Partial<Recipe>): Promise<Recipe | null> => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        ingredients:recipe_ingredients(
          *,
          inventory_stock:inventory_stock(*)
        )
      `)
      .single();

    if (error) throw error;

    toast.success('Recipe updated successfully');
    return data;
  } catch (error) {
    console.error('Error updating recipe:', error);
    toast.error('Failed to update recipe');
    return null;
  }
};

export const deleteRecipe = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('recipes')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    toast.success('Recipe deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting recipe:', error);
    toast.error('Failed to delete recipe');
    return false;
  }
};

export const addRecipeIngredient = async (recipeIngredient: Omit<RecipeIngredient, 'id' | 'created_at'>): Promise<RecipeIngredient | null> => {
  try {
    const { data, error } = await supabase
      .from('recipe_ingredients')
      .insert(recipeIngredient)
      .select(`
        *,
        inventory_stock:inventory_stock(*)
      `)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error adding recipe ingredient:', error);
    toast.error('Failed to add ingredient to recipe');
    return null;
  }
};

export const removeRecipeIngredient = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error removing recipe ingredient:', error);
    toast.error('Failed to remove ingredient from recipe');
    return false;
  }
};

export const fetchInventoryStock = async (storeId: string): Promise<InventoryStock[]> => {
  try {
    const { data, error } = await supabase
      .from('inventory_stock')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('item');

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching inventory stock:', error);
    toast.error('Failed to fetch inventory stock');
    return [];
  }
};

export const calculateRecipeCost = (recipe: Recipe): number => {
  return recipe.ingredients?.reduce((total, ingredient) => {
    const cost = ingredient.inventory_stock?.cost || 0;
    return total + (cost * ingredient.quantity);
  }, 0) || 0;
};

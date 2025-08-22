import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UnifiedRecipe {
  id: string;
  name: string;
  store_id: string;
  total_cost: number;
  cost_per_serving: number;
  serving_size: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  ingredients?: UnifiedRecipeIngredient[];
}

export interface UnifiedRecipeIngredient {
  id: string;
  recipe_id: string;
  inventory_stock_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  total_cost: number;
}

export interface CreateRecipeData {
  name: string;
  store_id: string;
  ingredients: Array<{
    inventory_stock_id: string;
    ingredient_name: string;
    quantity: number;
    unit: string;
    cost_per_unit: number;
  }>;
}

export const unifiedRecipeService = {
  // Fetch all recipes for a store
  async getRecipesByStore(storeId: string): Promise<UnifiedRecipe[]> {
    try {
      // Get unified recipes (new system)
      const { data: unifiedData, error: unifiedError } = await supabase
        .from('unified_recipes')
        .select(`
          *,
          unified_recipe_ingredients (
            id,
            inventory_stock_id,
            ingredient_name,
            quantity,
            unit,
            cost_per_unit,
            total_cost
          )
        `)
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (unifiedError) throw unifiedError;

      const unifiedRecipes = unifiedData?.map(recipe => ({
        ...recipe,
        cost_per_serving: recipe.cost_per_serving || 0,
        ingredients: recipe.unified_recipe_ingredients?.map(ing => ({
          ...ing,
          recipe_id: recipe.id
        })) || []
      })) || [];

      // Return only unified recipes
      return unifiedRecipes;
    } catch (error) {
      console.error('Error fetching recipes:', error);
      toast.error('Failed to fetch recipes');
      return [];
    }
  },

  // Get a single recipe with ingredients
  async getRecipeById(recipeId: string): Promise<UnifiedRecipe | null> {
    try {
      const { data, error } = await supabase
        .from('unified_recipes')
        .select(`
          *,
          unified_recipe_ingredients (
            id,
            inventory_stock_id,
            ingredient_name,
            quantity,
            unit,
            cost_per_unit,
            total_cost
          )
        `)
        .eq('id', recipeId)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      return data ? {
        ...data,
        ingredients: data.unified_recipe_ingredients?.map(ing => ({
          ...ing,
          recipe_id: data.id
        })) || []
      } : null;
    } catch (error) {
      console.error('Error fetching recipe:', error);
      toast.error('Failed to fetch recipe');
      return null;
    }
  },

  // Create a new recipe
  async createRecipe(recipeData: CreateRecipeData): Promise<UnifiedRecipe | null> {
    try {
      // Start transaction - create recipe first
      const { data: recipe, error: recipeError } = await supabase
        .from('unified_recipes')
        .insert({
          name: recipeData.name,
          store_id: recipeData.store_id,
          serving_size: 1,
          is_active: true
        })
        .select()
        .single();

      if (recipeError) throw recipeError;

      // Create ingredients
      if (recipeData.ingredients.length > 0) {
        const ingredientInserts = recipeData.ingredients.map(ingredient => ({
          recipe_id: recipe.id,
          inventory_stock_id: ingredient.inventory_stock_id,
          ingredient_name: ingredient.ingredient_name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          cost_per_unit: ingredient.cost_per_unit
        }));

        const { error: ingredientsError } = await supabase
          .from('unified_recipe_ingredients')
          .insert(ingredientInserts);

        if (ingredientsError) throw ingredientsError;
      }

      toast.success('Recipe created successfully');
      return await this.getRecipeById(recipe.id);
    } catch (error) {
      console.error('Error creating recipe:', error);
      toast.error('Failed to create recipe');
      return null;
    }
  },

  // Update an existing recipe
  async updateRecipe(recipeId: string, recipeData: Omit<CreateRecipeData, 'store_id'>): Promise<UnifiedRecipe | null> {
    try {
      // Update recipe name
      const { error: recipeError } = await supabase
        .from('unified_recipes')
        .update({
          name: recipeData.name,
          updated_at: new Date().toISOString()
        })
        .eq('id', recipeId);

      if (recipeError) throw recipeError;

      // Delete existing ingredients
      const { error: deleteError } = await supabase
        .from('unified_recipe_ingredients')
        .delete()
        .eq('recipe_id', recipeId);

      if (deleteError) throw deleteError;

      // Insert new ingredients
      if (recipeData.ingredients.length > 0) {
        const ingredientInserts = recipeData.ingredients.map(ingredient => ({
          recipe_id: recipeId,
          inventory_stock_id: ingredient.inventory_stock_id,
          ingredient_name: ingredient.ingredient_name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          cost_per_unit: ingredient.cost_per_unit
        }));

        const { error: ingredientsError } = await supabase
          .from('unified_recipe_ingredients')
          .insert(ingredientInserts);

        if (ingredientsError) throw ingredientsError;
      }

      toast.success('Recipe updated successfully');
      return await this.getRecipeById(recipeId);
    } catch (error) {
      console.error('Error updating recipe:', error);
      toast.error('Failed to update recipe');
      return null;
    }
  },

  // Delete a recipe
  async deleteRecipe(recipeId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('unified_recipes')
        .update({ is_active: false })
        .eq('id', recipeId);

      if (error) throw error;

      toast.success('Recipe deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting recipe:', error);
      toast.error('Failed to delete recipe');
      return false;
    }
  },

  // Search recipes by name
  async searchRecipes(storeId: string, searchTerm: string): Promise<UnifiedRecipe[]> {
    try {
      const { data, error } = await supabase
        .from('unified_recipes')
        .select(`
          *,
          unified_recipe_ingredients (
            id,
            inventory_stock_id,
            ingredient_name,
            quantity,
            unit,
            cost_per_unit,
            total_cost
          )
        `)
        .eq('store_id', storeId)
        .eq('is_active', true)
        .ilike('name', `%${searchTerm}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(recipe => ({
        ...recipe,
        ingredients: recipe.unified_recipe_ingredients?.map(ing => ({
          ...ing,
          recipe_id: recipe.id
        })) || []
      })) || [];
    } catch (error) {
      console.error('Error searching recipes:', error);
      toast.error('Failed to search recipes');
      return [];
    }
  }
};
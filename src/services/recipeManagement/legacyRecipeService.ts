import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LegacyRecipe {
  id: string;
  name: string;
  store_id: string;
  template_id?: string;
  instructions?: string;
  serving_size: number;
  total_cost: number;
  cost_per_serving: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  ingredients?: LegacyRecipeIngredient[];
}

export interface LegacyRecipeIngredient {
  id: string;
  recipe_id?: string;
  inventory_stock_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
}

export interface CreateLegacyRecipeData {
  name: string;
  store_id: string;
  instructions?: string;
  serving_size?: number;
  ingredients: Array<{
    inventory_stock_id: string;
    ingredient_name: string;
    quantity: number;
    unit: string;
    cost_per_unit: number;
  }>;
}

export const legacyRecipeService = {
  // Fetch all legacy recipes for a store
  async getRecipesByStore(storeId: string): Promise<LegacyRecipe[]> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients_with_names (
            id,
            recipe_id,
            inventory_stock_id,
            ingredient_name,
            quantity,
            unit,
            cost_per_unit
          )
        `)
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return (data || []).map(recipe => ({
        ...recipe,
        ingredients: recipe.recipe_ingredients_with_names || []
      }));
    } catch (error) {
      console.error('Error fetching legacy recipes:', error);
      toast.error('Failed to fetch recipes');
      throw error;
    }
  },

  // Fetch a single legacy recipe by ID
  async getRecipeById(recipeId: string): Promise<LegacyRecipe | null> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients_with_names (
            id,
            recipe_id,
            inventory_stock_id,
            ingredient_name,
            quantity,
            unit,
            cost_per_unit
          )
        `)
        .eq('id', recipeId)
        .single();

      if (error) throw error;

      return data ? {
        ...data,
        ingredients: data.recipe_ingredients_with_names || []
      } : null;
    } catch (error) {
      console.error('Error fetching legacy recipe:', error);
      return null;
    }
  },

  // Create a new legacy recipe
  async createRecipe(recipeData: CreateLegacyRecipeData): Promise<LegacyRecipe | null> {
    try {
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          name: recipeData.name,
          store_id: recipeData.store_id,
          instructions: recipeData.instructions || '',
          serving_size: recipeData.serving_size || 1,
          total_cost: 0,
          cost_per_serving: 0,
          is_active: true
        })
        .select()
        .single();

      if (recipeError) throw recipeError;

      // Add ingredients
      if (recipeData.ingredients.length > 0) {
        const ingredientsData = recipeData.ingredients.map(ing => ({
          recipe_id: recipe.id,
          inventory_stock_id: ing.inventory_stock_id,
          quantity: ing.quantity,
          unit: ing.unit as any, // Cast to handle flexible unit types
          cost_per_unit: ing.cost_per_unit
        }));

        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientsData);

        if (ingredientsError) throw ingredientsError;

        // Calculate and update recipe costs
        await this.updateRecipeCosts(recipe.id);
      }

      toast.success('Recipe created successfully!');
      return await this.getRecipeById(recipe.id);
    } catch (error) {
      console.error('Error creating legacy recipe:', error);
      toast.error('Failed to create recipe');
      throw error;
    }
  },

  // Update an existing legacy recipe
  async updateRecipe(recipeId: string, recipeData: Omit<CreateLegacyRecipeData, 'store_id'>): Promise<LegacyRecipe | null> {
    try {
      // Update recipe basic info
      const { error: recipeError } = await supabase
        .from('recipes')
        .update({
          name: recipeData.name,
          instructions: recipeData.instructions || '',
          serving_size: recipeData.serving_size || 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', recipeId);

      if (recipeError) throw recipeError;

      // Delete existing ingredients
      const { error: deleteError } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', recipeId);

      if (deleteError) throw deleteError;

      // Add new ingredients
      if (recipeData.ingredients.length > 0) {
        const ingredientsData = recipeData.ingredients.map(ing => ({
          recipe_id: recipeId,
          inventory_stock_id: ing.inventory_stock_id,
          quantity: ing.quantity,
          unit: ing.unit as any, // Cast to handle flexible unit types
          cost_per_unit: ing.cost_per_unit
        }));

        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientsData);

        if (ingredientsError) throw ingredientsError;
      }

      // Update recipe costs
      await this.updateRecipeCosts(recipeId);

      toast.success('Recipe updated successfully!');
      return await this.getRecipeById(recipeId);
    } catch (error) {
      console.error('Error updating legacy recipe:', error);
      toast.error('Failed to update recipe');
      throw error;
    }
  },

  // Delete a legacy recipe
  async deleteRecipe(recipeId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('recipes')
        .update({ is_active: false })
        .eq('id', recipeId);

      if (error) throw error;

      toast.success('Recipe deleted successfully!');
      return true;
    } catch (error) {
      console.error('Error deleting legacy recipe:', error);
      toast.error('Failed to delete recipe');
      return false;
    }
  },

  // Update recipe costs based on ingredients
  async updateRecipeCosts(recipeId: string): Promise<void> {
    try {
      const { data: ingredients } = await supabase
        .from('recipe_ingredients')
        .select('quantity, cost_per_unit')
        .eq('recipe_id', recipeId);

      const { data: recipe } = await supabase
        .from('recipes')
        .select('serving_size')
        .eq('id', recipeId)
        .single();

      if (ingredients && recipe) {
        const totalCost = ingredients.reduce(
          (sum, ing) => sum + (ing.quantity * ing.cost_per_unit), 
          0
        );
        
        const costPerServing = recipe.serving_size > 0 ? totalCost / recipe.serving_size : 0;

        await supabase
          .from('recipes')
          .update({
            total_cost: totalCost,
            cost_per_serving: costPerServing,
            updated_at: new Date().toISOString()
          })
          .eq('id', recipeId);
      }
    } catch (error) {
      console.error('Error updating recipe costs:', error);
    }
  },

  // Search recipes by name
  async searchRecipes(storeId: string, searchTerm: string): Promise<LegacyRecipe[]> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients_with_names (
            id,
            recipe_id,
            inventory_stock_id,
            ingredient_name,
            quantity,
            unit,
            cost_per_unit
          )
        `)
        .eq('store_id', storeId)
        .eq('is_active', true)
        .ilike('name', `%${searchTerm}%`)
        .order('name');

      if (error) throw error;

      return (data || []).map(recipe => ({
        ...recipe,
        ingredients: recipe.recipe_ingredients_with_names || []
      }));
    } catch (error) {
      console.error('Error searching legacy recipes:', error);
      return [];
    }
  }
};
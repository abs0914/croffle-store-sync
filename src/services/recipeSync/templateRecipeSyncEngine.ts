import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Core Template-Recipe Synchronization Engine
 * Ensures all deployed recipes stay in sync with their templates
 */
export class TemplateRecipeSyncEngine {
  
  /**
   * Synchronize all recipes for a template across all stores
   */
  static async syncTemplateToAllRecipes(templateId: string): Promise<boolean> {
    try {
      console.log('🔄 Starting template-to-recipe sync for template:', templateId);
      
      // Get template ingredients
      const { data: templateIngredients, error: templateError } = await supabase
        .from('recipe_template_ingredients')
        .select('*')
        .eq('recipe_template_id', templateId);
        
      if (templateError) throw templateError;
      
      // Get all recipes using this template
      const { data: recipes, error: recipesError } = await supabase
        .from('recipes')
        .select('id, store_id, name')
        .eq('template_id', templateId)
        .eq('is_active', true);
        
      if (recipesError) throw recipesError;
      
      let syncCount = 0;
      for (const recipe of recipes || []) {
        const success = await this.syncRecipeIngredients(recipe.id, templateIngredients, recipe.store_id);
        if (success) syncCount++;
      }
      
      console.log(`✅ Synchronized ${syncCount}/${recipes?.length || 0} recipes for template ${templateId}`);
      return true;
    } catch (error) {
      console.error('❌ Template sync failed:', error);
      return false;
    }
  }
  
  /**
   * Synchronize a single recipe with its template
   */
  static async syncRecipeWithTemplate(recipeId: string): Promise<boolean> {
    try {
      // Get recipe and template info
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .select('id, template_id, store_id, name')
        .eq('id', recipeId)
        .single();
        
      if (recipeError || !recipe?.template_id) {
        console.error('Recipe or template not found');
        return false;
      }
      
      // Get template ingredients
      const { data: templateIngredients, error: templateError } = await supabase
        .from('recipe_template_ingredients')
        .select('*')
        .eq('recipe_template_id', recipe.template_id);
        
      if (templateError) throw templateError;
      
      return await this.syncRecipeIngredients(recipeId, templateIngredients, recipe.store_id);
    } catch (error) {
      console.error('❌ Recipe sync failed:', error);
      return false;
    }
  }
  
  /**
   * Core ingredient synchronization logic
   */
  private static async syncRecipeIngredients(
    recipeId: string,
    templateIngredients: any[],
    storeId: string
  ): Promise<boolean> {
    try {
      // Clear existing recipe ingredients
      await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', recipeId);
      
      // Create new ingredients based on template
      const ingredientInserts = [];
      
      for (const templateIngredient of templateIngredients) {
        // Find or create corresponding store inventory item
        const inventoryItem = await this.findOrCreateStoreInventoryItem(
          templateIngredient.ingredient_name,
          templateIngredient.unit,
          templateIngredient.cost_per_unit,
          storeId
        );
        
        if (inventoryItem) {
          ingredientInserts.push({
            recipe_id: recipeId,
            commissary_item_id: templateIngredient.commissary_item_id,
            inventory_stock_id: inventoryItem.id,
            quantity: templateIngredient.quantity,
            unit: templateIngredient.unit,
            cost_per_unit: templateIngredient.cost_per_unit
          });
        }
      }
      
      if (ingredientInserts.length > 0) {
        const { error: insertError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientInserts);
          
        if (insertError) throw insertError;
      }
      
      // Update recipe cost
      await this.updateRecipeCost(recipeId);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to sync recipe ingredients:', error);
      return false;
    }
  }
  
  /**
   * Find or create store inventory item for recipe ingredient
   */
  private static async findOrCreateStoreInventoryItem(
    ingredientName: string,
    unit: string,
    costPerUnit: number,
    storeId: string
  ): Promise<any> {
    try {
      // First try to find existing item
      const { data: existing, error: findError } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', storeId)
        .eq('item', ingredientName)
        .eq('unit', unit)
        .single();
        
      if (!findError && existing) {
        return existing;
      }
      
      // Create new inventory item if not found
      const { data: newItem, error: createError } = await supabase
        .from('inventory_stock')
        .insert({
          store_id: storeId,
          item: ingredientName,
          unit: unit,
          stock_quantity: 0,
          cost: costPerUnit,
          is_active: true,
          minimum_threshold: 10
        })
        .select()
        .single();
        
      if (createError) {
        console.error('Failed to create inventory item:', createError);
        return null;
      }
      
      return newItem;
    } catch (error) {
      console.error('Error handling inventory item:', error);
      return null;
    }
  }
  
  /**
   * Update recipe total cost based on ingredients
   */
  private static async updateRecipeCost(recipeId: string): Promise<void> {
    try {
      const { data: ingredients } = await supabase
        .from('recipe_ingredients')
        .select('quantity, cost_per_unit')
        .eq('recipe_id', recipeId);
        
      const totalCost = (ingredients || []).reduce((sum, ingredient) => {
        return sum + (ingredient.quantity * ingredient.cost_per_unit);
      }, 0);
      
      await supabase
        .from('recipes')
        .update({
          total_cost: totalCost,
          cost_per_serving: totalCost / 1, // Assuming serving size of 1
          updated_at: new Date().toISOString()
        })
        .eq('id', recipeId);
    } catch (error) {
      console.error('Failed to update recipe cost:', error);
    }
  }
  
  /**
   * Detect and repair sync drift across all templates and recipes
   */
  static async detectAndRepairSyncDrift(): Promise<{
    driftDetected: number;
    repaired: number;
    failed: number;
  }> {
    try {
      console.log('🔍 Detecting template-recipe sync drift...');
      
      // Find recipes that might be out of sync
      const { data: recipes, error } = await supabase
        .from('recipes')
        .select(`
          id,
          template_id,
          updated_at,
          recipe_templates!inner(updated_at)
        `)
        .eq('is_active', true)
        .neq('template_id', null);
        
      if (error) throw error;
      
      const driftedRecipes = (recipes || []).filter(recipe => {
        if (!recipe.recipe_templates) return false;
        const recipeUpdated = new Date(recipe.updated_at);
        const templateUpdated = new Date(recipe.recipe_templates.updated_at);
        return templateUpdated > recipeUpdated;
      });
      
      console.log(`📊 Found ${driftedRecipes.length} recipes with potential sync drift`);
      
      let repaired = 0;
      let failed = 0;
      
      for (const recipe of driftedRecipes) {
        const success = await this.syncRecipeWithTemplate(recipe.id);
        if (success) {
          repaired++;
        } else {
          failed++;
        }
      }
      
      return {
        driftDetected: driftedRecipes.length,
        repaired,
        failed
      };
    } catch (error) {
      console.error('❌ Drift detection failed:', error);
      return { driftDetected: 0, repaired: 0, failed: 0 };
    }
  }
}
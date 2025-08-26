import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface InventoryBasedRecipe {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  yield_quantity: number;
  total_cost: number;
  store_id: string;
  ingredients: InventoryBasedIngredient[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface InventoryBasedIngredient {
  id?: string;
  recipe_id: string;
  inventory_stock_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
}

export interface RecipeDeploymentResult {
  success: boolean;
  recipeId?: string;
  productId?: string;
  message: string;
  missingIngredients?: string[];
}

/**
 * Service for managing inventory-based recipes
 */
export class InventoryBasedRecipeService {
  
  /**
   * Create a recipe template that can be deployed to stores
   */
  static async createRecipeTemplate(templateData: {
    name: string;
    description?: string;
    instructions?: string;
    yield_quantity: number;
    ingredients: Array<{
      ingredient_name: string;
      quantity: number;
      unit: string;
      cost_per_unit: number;
    }>;
  }) {
    try {
      console.log('Creating recipe template:', templateData);

      // Create the template record
      const { data: template, error: templateError } = await supabase
        .from('recipe_templates')
        .insert({
          name: templateData.name,
          description: templateData.description,
          instructions: templateData.instructions,
          yield_quantity: templateData.yield_quantity,
          is_active: true
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create template ingredients
      if (templateData.ingredients.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('recipe_template_ingredients')
          .insert(
            templateData.ingredients.map(ing => ({
              recipe_template_id: template.id,
              ingredient_name: ing.ingredient_name,
              quantity: ing.quantity,
              unit: ing.unit,
              cost_per_unit: ing.cost_per_unit,
              location_type: 'all',
              uses_store_inventory: true
            }))
          );

        if (ingredientsError) throw ingredientsError;
      }

      toast.success('Recipe template created successfully');
      return template;
    } catch (error) {
      console.error('Error creating recipe template:', error);
      toast.error('Failed to create recipe template');
      throw error;
    }
  }

  /**
   * Deploy a recipe template to a specific store
   */
  static async deployTemplateToStore(templateId: string, storeId: string): Promise<RecipeDeploymentResult> {
    try {
      console.log('Deploying template to store:', { templateId, storeId });

      // Get template data
      const { data: template, error: templateError } = await supabase
        .from('recipe_templates')
        .select(`
          *,
          recipe_template_ingredients (*)
        `)
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      // Validate ingredients exist in store inventory
      const missingIngredients: string[] = [];
      
      for (const ingredient of template.recipe_template_ingredients) {
        const { data: inventoryItem } = await supabase
          .from('inventory_stock')
          .select('id, item, unit, cost')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .ilike('item', `%${ingredient.ingredient_name}%`)
          .eq('unit', ingredient.unit)
          .maybeSingle();

        if (!inventoryItem) {
          missingIngredients.push(`${ingredient.ingredient_name} (${ingredient.unit})`);
        }
      }

      if (missingIngredients.length > 0) {
        return {
          success: false,
          message: 'Missing inventory items for recipe deployment',
          missingIngredients
        };
      }

      // Create the recipe
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          name: template.name,
          description: template.description,
          instructions: template.instructions,
          yield_quantity: template.yield_quantity,
          recipe_template_id: template.id,
          store_id: storeId,
          is_active: true,
          total_cost: 0 // Will be calculated after ingredients
        })
        .select()
        .single();

      if (recipeError) throw recipeError;

      // Create recipe ingredients with inventory links
      const recipeIngredients = [];
      let totalCost = 0;

      for (const templateIngredient of template.recipe_template_ingredients) {
        const { data: inventoryItem } = await supabase
          .from('inventory_stock')
          .select('id, item, unit, cost')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .ilike('item', `%${templateIngredient.ingredient_name}%`)
          .eq('unit', templateIngredient.unit)
          .single();

        const ingredientCost = inventoryItem?.cost || templateIngredient.cost_per_unit;
        const ingredientTotalCost = templateIngredient.quantity * ingredientCost;
        totalCost += ingredientTotalCost;

        recipeIngredients.push({
          recipe_id: recipe.id,
          inventory_stock_id: inventoryItem?.id,
          ingredient_name: templateIngredient.ingredient_name,
          quantity: templateIngredient.quantity,
          unit: templateIngredient.unit,
          cost_per_unit: ingredientCost
        });
      }

      // Insert recipe ingredients
      const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .insert(recipeIngredients);

      if (ingredientsError) throw ingredientsError;

      // Update recipe total cost
      const { error: updateError } = await supabase
        .from('recipes')
        .update({ total_cost: totalCost })
        .eq('id', recipe.id);

      if (updateError) throw updateError;

      // Create product catalog entry
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          name: template.name,
          description: template.description,
          cost: totalCost,
          sku: `RCP-${template.name.replace(/\s+/g, '-').toUpperCase()}-${Date.now()}`,
          store_id: storeId,
          recipe_id: recipe.id,
          is_active: true,
          product_type: 'recipe',
          stock_quantity: 100 // Default stock
        })
        .select()
        .single();

      if (productError) throw productError;

      return {
        success: true,
        recipeId: recipe.id,
        productId: product.id,
        message: `Successfully deployed "${template.name}" to store`
      };

    } catch (error) {
      console.error('Error deploying template:', error);
      return {
        success: false,
        message: `Failed to deploy recipe: ${error.message}`
      };
    }
  }

  /**
   * Sync all products with their recipe templates
   */
  static async syncAllStoreRecipes(storeId: string) {
    try {
      console.log('Syncing all store recipes for store:', storeId);

      // Get all active recipe templates
      const { data: templates, error: templatesError } = await supabase
        .from('recipe_templates')
        .select('*')
        .eq('is_active', true);

      if (templatesError) throw templatesError;

      const results = {
        linked: 0,
        created: 0,
        errors: [] as string[]
      };

      for (const template of templates) {
        try {
          const result = await this.deployTemplateToStore(template.id, storeId);
          if (result.success) {
            results.created++;
          } else {
            results.errors.push(`${template.name}: ${result.message}`);
          }
        } catch (error) {
          results.errors.push(`${template.name}: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      console.error('Error syncing store recipes:', error);
      throw error;
    }
  }

  /**
   * Get recipe deployment status for a store
   */
  static async getStoreRecipeStatus(storeId: string) {
    try {
      const { data: templates, error: templatesError } = await supabase
        .from('recipe_templates')
        .select(`
          *,
          recipes!recipes_recipe_template_id_fkey (
            id,
            name,
            store_id,
            is_active
          )
        `)
        .eq('is_active', true);

      if (templatesError) throw templatesError;

      return templates.map(template => ({
        template_id: template.id,
        template_name: template.name,
        status: template.recipes?.some((r: any) => r.store_id === storeId && r.is_active) 
          ? 'deployed' 
          : 'not_deployed'
      }));
    } catch (error) {
      console.error('Error getting recipe status:', error);
      throw error;
    }
  }
}
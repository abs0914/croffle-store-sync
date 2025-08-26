import { supabase } from "@/integrations/supabase/client";
import { RecipeTemplate } from "./types";

// Simplified recipe service with better error handling and validation
export class SimpleRecipeService {
  
  // Get all recipe templates with basic error handling
  static async getTemplates(): Promise<RecipeTemplate[]> {
    try {
      console.log('Fetching recipe templates...');
      
      const { data, error } = await supabase
        .from('recipe_templates')
        .select(`
          *,
          recipe_template_ingredients (*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error fetching templates:', error);
        throw new Error(`Failed to fetch recipe templates: ${error.message}`);
      }

      if (!data) {
        console.log('No recipe templates found');
        return [];
      }

      console.log(`Successfully fetched ${data.length} recipe templates`);

      return data.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        category_name: template.category_name,
        instructions: template.instructions,
        yield_quantity: template.yield_quantity,
        serving_size: template.serving_size,
        version: template.version || 1,
        is_active: template.is_active || true,
        created_by: template.created_by || 'system',
        created_at: template.created_at,
        updated_at: template.updated_at,
        price: template.price,
        suggested_price: template.suggested_price,
        ingredients: (template.recipe_template_ingredients || []).map((ing: any) => ({
          id: ing.id,
          recipe_template_id: template.id,
          ingredient_name: ing.commissary_item_name || ing.ingredient_name || 'Unknown',
          quantity: ing.quantity,
          unit: ing.unit,
          cost_per_unit: ing.cost_per_unit,
          location_type: ing.location_type || 'all',
          uses_store_inventory: ing.uses_store_inventory || false,
          inventory_stock_id: ing.inventory_stock_id,
          store_unit: ing.store_unit,
          recipe_to_store_conversion_factor: ing.recipe_to_store_conversion_factor
        }))
      })) as RecipeTemplate[];
      
    } catch (error: any) {
      console.error('Error in getTemplates:', error);
      throw error;
    }
  }

  // Calculate template cost with validation
  static calculateTemplateCost(template: RecipeTemplate): number {
    if (!template.ingredients || template.ingredients.length === 0) {
      console.warn(`Template ${template.name} has no ingredients`);
      return 0;
    }

    let totalCost = 0;
    let hasValidCosts = false;

    template.ingredients.forEach(ingredient => {
      const cost = ingredient.cost_per_unit || 0;
      const quantity = ingredient.quantity || 0;
      
      if (cost > 0 && quantity > 0) {
        totalCost += cost * quantity;
        hasValidCosts = true;
      } else {
        console.warn(`Invalid cost/quantity for ingredient ${ingredient.ingredient_name}: cost=${cost}, quantity=${quantity}`);
      }
    });

    if (!hasValidCosts) {
      console.warn(`Template ${template.name} has no valid ingredient costs`);
    }

    return Math.round(totalCost * 100) / 100; // Round to 2 decimal places
  }

  // Get deployed recipes with error handling
  static async getDeployedRecipes(): Promise<any[]> {
    try {
      console.log('Fetching deployed recipes...');
      
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients (
            *,
            inventory_stock (*)
          ),
          stores:store_id (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error fetching deployed recipes:', error);
        throw new Error(`Failed to fetch deployed recipes: ${error.message}`);
      }

      console.log(`Successfully fetched ${data?.length || 0} deployed recipes`);
      return data || [];
      
    } catch (error: any) {
      console.error('Error in getDeployedRecipes:', error);
      throw error;
    }
  }

  // Simple validation for recipe data
  static validateRecipeTemplate(template: Partial<RecipeTemplate>): void {
    const errors: string[] = [];

    if (!template.name?.trim()) {
      errors.push('Recipe name is required');
    }

    if (!template.serving_size || template.serving_size <= 0) {
      errors.push('Serving size must be greater than zero');
    }

    if (!template.ingredients || template.ingredients.length === 0) {
      errors.push('At least one ingredient is required');
    } else {
      template.ingredients.forEach((ingredient, index) => {
        if (!ingredient.ingredient_name?.trim()) {
          errors.push(`Ingredient ${index + 1}: name is required`);
        }
        if (!ingredient.quantity || ingredient.quantity <= 0) {
          errors.push(`Ingredient ${index + 1}: quantity must be greater than zero`);
        }
        if (!ingredient.unit?.trim()) {
          errors.push(`Ingredient ${index + 1}: unit is required`);
        }
        // Note: cost_per_unit validation is handled by database trigger
      });
    }

    if (errors.length > 0) {
      throw new Error(`Recipe validation failed:\n• ${errors.join('\n• ')}`);
    }
  }

  // Health check for recipe system
  static async healthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check if we can connect to database
      const { error: connectionError } = await supabase
        .from('recipe_templates')
        .select('count(*)')
        .limit(1);

      if (connectionError) {
        issues.push(`Database connection failed: ${connectionError.message}`);
      }

      // Check for templates with zero costs
      const { data: zeroCostTemplates, error: costError } = await supabase
        .from('recipe_template_ingredients')
        .select('recipe_template_id, ingredient_name')
        .eq('cost_per_unit', 0)
        .limit(5);

      if (costError) {
        issues.push(`Cost validation check failed: ${costError.message}`);
      } else if (zeroCostTemplates && zeroCostTemplates.length > 0) {
        issues.push(`Found ${zeroCostTemplates.length} ingredients with zero cost`);
      }

      return {
        healthy: issues.length === 0,
        issues
      };

    } catch (error: any) {
      issues.push(`Health check failed: ${error.message}`);
      return { healthy: false, issues };
    }
  }
}
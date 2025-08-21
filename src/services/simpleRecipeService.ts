import { supabase } from '@/integrations/supabase/client';

export interface SimpleRecipeSync {
  productId: string;
  productName: string;
  templateId?: string;
  templateName?: string;
  status: 'linked' | 'needs_template' | 'needs_recipe';
}

/**
 * Simple, direct recipe management service
 * No complex validation - just direct database operations
 */
export class SimpleRecipeService {
  
  /**
   * Get sync status for all products in a store
   */
  static async getStoreSyncStatus(storeId: string): Promise<SimpleRecipeSync[]> {
    const { data: products } = await supabase
      .from('products')
      .select(`
        id, name, recipe_id,
        recipes (
          id, template_id,
          recipe_templates (id, name)
        )
      `)
      .eq('store_id', storeId)
      .eq('is_active', true);

    return (products || []).map(product => ({
      productId: product.id,
      productName: product.name,
      templateId: (product as any).recipes?.recipe_templates?.id,
      templateName: (product as any).recipes?.recipe_templates?.name,
      status: product.recipe_id ? 'linked' : 'needs_recipe'
    }));
  }

  /**
   * Direct sync - link products to templates, create missing ones
   */
  static async syncStoreRecipes(storeId: string): Promise<{
    linked: number;
    created: number;
    errors: string[];
  }> {
    let linked = 0;
    let created = 0;
    const errors: string[] = [];

    try {
      // Get unlinked products
      const { data: products } = await supabase
        .from('products')
        .select('id, name')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .is('recipe_id', null);

      // Get available templates
      const { data: templates } = await supabase
        .from('recipe_templates')
        .select('id, name')
        .eq('is_active', true);

      if (!products || !templates) {
        throw new Error('Failed to fetch products or templates');
      }

      for (const product of products) {
        try {
          // Find matching template (exact or partial match)
          let template = templates.find(t => 
            t.name.toLowerCase().trim() === product.name.toLowerCase().trim()
          );

          if (!template) {
            template = templates.find(t => 
              t.name.toLowerCase().includes(product.name.toLowerCase()) ||
              product.name.toLowerCase().includes(t.name.toLowerCase())
            );
          }

          let templateId = template?.id;

          // Create template if none found
          if (!template) {
            const { data: newTemplate, error } = await supabase
              .from('recipe_templates')
              .insert({
                name: product.name,
                description: `Auto-generated for ${product.name}`,
                instructions: 'Add preparation steps',
                estimated_cost: 0,
                serving_size: 1,
                prep_time_minutes: 5,
                recipe_type: 'simple',
                is_active: true
              })
              .select('id')
              .single();

            if (error || !newTemplate) {
              errors.push(`Failed to create template for ${product.name}: ${error?.message}`);
              continue;
            }

            templateId = newTemplate.id;
            created++;
          }

          // Create recipe linking product to template
          const { data: recipe, error: recipeError } = await supabase
            .from('recipes')
            .insert({
              name: product.name,
              store_id: storeId,
              template_id: templateId,
              is_active: true,
              serving_size: 1,
              total_cost: 0,
              cost_per_serving: 0
            })
            .select('id')
            .single();

          if (recipeError || !recipe) {
            errors.push(`Failed to create recipe for ${product.name}: ${recipeError?.message}`);
            continue;
          }

          // Link product to recipe
          const { error: linkError } = await supabase
            .from('products')
            .update({ recipe_id: recipe.id })
            .eq('id', product.id);

          if (linkError) {
            errors.push(`Failed to link product ${product.name}: ${linkError.message}`);
            continue;
          }

          if (template) {
            linked++;
          }

        } catch (error) {
          errors.push(`Error processing ${product.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

    } catch (error) {
      errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { linked, created, errors };
  }

  /**
   * Create missing inventory items for recipe ingredients
   */
  static async createMissingInventoryItems(storeId: string): Promise<{
    created: number;
    errors: string[];
  }> {
    let created = 0;
    const errors: string[] = [];

    try {
      // Get all recipe ingredients for store recipes
      const { data: recipeIngredients } = await supabase
        .from('recipe_template_ingredients')
        .select(`
          ingredient_name, unit,
          recipe_templates!inner (
            recipes!inner (store_id)
          )
        `)
        .eq('recipe_templates.recipes.store_id', storeId);

      if (!recipeIngredients) return { created: 0, errors: [] };

      // Get existing inventory items
      const { data: existingItems } = await supabase
        .from('inventory_stock')
        .select('item, unit')
        .eq('store_id', storeId);

      const existingItemsSet = new Set(
        (existingItems || []).map(item => `${item.item.toLowerCase()}:${item.unit.toLowerCase()}`)
      );

      // Find missing ingredients
      const missingIngredients = recipeIngredients.filter(ingredient => 
        !existingItemsSet.has(`${ingredient.ingredient_name.toLowerCase()}:${ingredient.unit.toLowerCase()}`)
      );

      // Create missing inventory items
      for (const ingredient of missingIngredients) {
        try {
          const { error } = await supabase
            .from('inventory_stock')
            .insert({
              store_id: storeId,
              item: ingredient.ingredient_name,
              unit: ingredient.unit,
              stock_quantity: 0,
              minimum_threshold: 5,
              maximum_capacity: 100,
              cost: 0,
              is_active: true
            });

          if (error) {
            errors.push(`Failed to create inventory item ${ingredient.ingredient_name}: ${error.message}`);
          } else {
            created++;
          }
        } catch (error) {
          errors.push(`Error creating ${ingredient.ingredient_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

    } catch (error) {
      errors.push(`Failed to sync inventory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { created, errors };
  }

  /**
   * One-click complete sync for a store
   */
  static async fullStoreSync(storeId: string): Promise<{
    recipesLinked: number;
    templatesCreated: number;
    inventoryCreated: number;
    errors: string[];
  }> {
    // First sync recipes
    const recipeResult = await this.syncStoreRecipes(storeId);
    
    // Then create missing inventory items
    const inventoryResult = await this.createMissingInventoryItems(storeId);
    
    return {
      recipesLinked: recipeResult.linked,
      templatesCreated: recipeResult.created,
      inventoryCreated: inventoryResult.created,
      errors: [...recipeResult.errors, ...inventoryResult.errors]
    };
  }
}
import { supabase } from "@/integrations/supabase/client";

export interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: any;
  count?: number;
}

export class SystemHealthValidator {
  async validateCompleteSystem(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    // Check recipe templates
    results.push(await this.checkRecipeTemplates());
    
    // Check recipe deployments
    results.push(await this.checkRecipeDeployments());
    
    // Check inventory mappings
    results.push(await this.checkInventoryMappings());
    
    // Check product catalog
    results.push(await this.checkProductCatalog());
    
    // Check unit consistency
    results.push(await this.checkUnitConsistency());

    return results;
  }

  private async checkRecipeTemplates(): Promise<HealthCheckResult> {
    try {
      const { data: templates, error } = await supabase
        .from('recipe_templates')
        .select('id, name')
        .eq('is_active', true);

      if (error) throw error;

      const count = templates?.length || 0;

      return {
        component: 'Recipe Templates',
        status: count > 0 ? 'healthy' : 'warning',
        message: count > 0 
          ? `${count} active recipe templates found`
          : 'No active recipe templates found',
        count
      };
    } catch (error) {
      return {
        component: 'Recipe Templates',
        status: 'error',
        message: `Error checking templates: ${(error as Error).message}`
      };
    }
  }

  private async checkRecipeDeployments(): Promise<HealthCheckResult> {
    try {
      const { data: recipes, error } = await supabase
        .from('recipes')
        .select('id, name, store_id')
        .eq('is_active', true);

      if (error) throw error;

      const count = recipes?.length || 0;

      return {
        component: 'Recipe Deployments',
        status: count > 0 ? 'healthy' : 'warning',
        message: count > 0 
          ? `${count} recipes deployed to stores`
          : 'No recipes deployed to stores',
        count
      };
    } catch (error) {
      return {
        component: 'Recipe Deployments',
        status: 'error',
        message: `Error checking deployments: ${(error as Error).message}`
      };
    }
  }

  private async checkInventoryMappings(): Promise<HealthCheckResult> {
    try {
      const { data: inventory, error } = await supabase
        .from('inventory_stock')
        .select('id, item, unit, recipe_compatible')
        .eq('is_active', true);

      if (error) throw error;

      const count = inventory?.length || 0;
      const recipeCompatible = inventory?.filter(i => i.recipe_compatible).length || 0;

      return {
        component: 'Inventory Mappings',
        status: count > 0 && recipeCompatible > 0 ? 'healthy' : 'warning',
        message: count > 0 
          ? `${count} inventory items (${recipeCompatible} recipe-compatible)`
          : 'No inventory items found',
        count,
        details: { total: count, recipeCompatible }
      };
    } catch (error) {
      return {
        component: 'Inventory Mappings',
        status: 'error',
        message: `Error checking inventory: ${(error as Error).message}`
      };
    }
  }

  private async checkProductCatalog(): Promise<HealthCheckResult> {
    try {
      const { data: products, error } = await supabase
        .from('product_catalog')
        .select('id, product_name, recipe_id')
        .eq('is_available', true);

      if (error) throw error;

      const count = products?.length || 0;
      const withRecipes = products?.filter(p => p.recipe_id).length || 0;

      return {
        component: 'Product Catalog',
        status: count > 0 && withRecipes > 0 ? 'healthy' : 'warning',
        message: count > 0 
          ? `${count} products in catalog (${withRecipes} with recipes)`
          : 'No products in catalog',
        count,
        details: { total: count, withRecipes }
      };
    } catch (error) {
      return {
        component: 'Product Catalog',
        status: 'error',
        message: `Error checking catalog: ${(error as Error).message}`
      };
    }
  }

  private async checkUnitConsistency(): Promise<HealthCheckResult> {
    try {
      // Check for consistent units between recipe ingredients and inventory
      const { data: recipeIngredients, error: recipeError } = await supabase
        .from('recipe_ingredients_with_names')
        .select('ingredient_name, unit');

      if (recipeError) throw recipeError;

      const { data: inventory, error: inventoryError } = await supabase
        .from('inventory_stock')
        .select('item, unit');

      if (inventoryError) throw inventoryError;

      const unitMismatches: string[] = [];
      const inventoryMap = new Map(inventory?.map(i => [i.item.toLowerCase(), i.unit]) || []);

      recipeIngredients?.forEach(ingredient => {
        const inventoryUnit = inventoryMap.get(ingredient.ingredient_name.toLowerCase());
        if (inventoryUnit && inventoryUnit !== ingredient.unit) {
          unitMismatches.push(`${ingredient.ingredient_name}: recipe(${ingredient.unit}) vs inventory(${inventoryUnit})`);
        }
      });

      return {
        component: 'Unit Consistency',
        status: unitMismatches.length === 0 ? 'healthy' : 'warning',
        message: unitMismatches.length === 0 
          ? 'All units are consistent between recipes and inventory'
          : `${unitMismatches.length} unit mismatches found`,
        details: unitMismatches.length > 0 ? { mismatches: unitMismatches.slice(0, 5) } : undefined
      };
    } catch (error) {
      return {
        component: 'Unit Consistency',
        status: 'error',
        message: `Error checking unit consistency: ${(error as Error).message}`
      };
    }
  }

  async validateTransactionReadiness(storeId: string): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    // Check if store has recipes
    results.push(await this.checkStoreRecipes(storeId));
    
    // Check if store has inventory
    results.push(await this.checkStoreInventory(storeId));
    
    // Check if recipes have ingredient mappings
    results.push(await this.checkRecipeIngredientMappings(storeId));

    return results;
  }

  private async checkStoreRecipes(storeId: string): Promise<HealthCheckResult> {
    try {
      const { data: recipes, error } = await supabase
        .from('recipes')
        .select('id, name')
        .eq('store_id', storeId)
        .eq('is_active', true);

      if (error) throw error;

      const count = recipes?.length || 0;

      return {
        component: 'Store Recipes',
        status: count > 0 ? 'healthy' : 'error',
        message: count > 0 
          ? `${count} recipes available for transactions`
          : 'No recipes found - transactions will fail',
        count
      };
    } catch (error) {
      return {
        component: 'Store Recipes',
        status: 'error',
        message: `Error checking store recipes: ${(error as Error).message}`
      };
    }
  }

  private async checkStoreInventory(storeId: string): Promise<HealthCheckResult> {
    try {
      const { data: inventory, error } = await supabase
        .from('inventory_stock')
        .select('id, item, stock_quantity')
        .eq('store_id', storeId)
        .eq('is_active', true);

      if (error) throw error;

      const count = inventory?.length || 0;
      const withStock = inventory?.filter(i => i.stock_quantity > 0).length || 0;

      return {
        component: 'Store Inventory',
        status: count > 0 ? 'healthy' : 'error',
        message: count > 0 
          ? `${count} inventory items (${withStock} with stock > 0)`
          : 'No inventory items - production will fail',
        count,
        details: { total: count, withStock }
      };
    } catch (error) {
      return {
        component: 'Store Inventory',
        status: 'error',
        message: `Error checking store inventory: ${(error as Error).message}`
      };
    }
  }

  private async checkRecipeIngredientMappings(storeId: string): Promise<HealthCheckResult> {
    try {
      // Get recipes for this store and check if their ingredients have inventory mappings
      const { data: recipeIngredients, error } = await supabase
        .from('recipe_ingredients')
        .select(`
          ingredient_name,
          recipes!inner(store_id)
        `)
        .eq('recipes.store_id', storeId);

      if (error) throw error;

      const totalIngredients = recipeIngredients?.length || 0;
      
      // Check how many have corresponding inventory items
      const { data: inventory } = await supabase
        .from('inventory_stock')
        .select('item')
        .eq('store_id', storeId)
        .eq('is_active', true);

      const inventoryItems = new Set(inventory?.map(i => i.item.toLowerCase()) || []);
      const mappedIngredients = recipeIngredients?.filter((ing: any) => 
        ing.ingredient_name && inventoryItems.has(ing.ingredient_name.toLowerCase())
      ).length || 0;

      const mappingPercentage = totalIngredients > 0 ? Math.round((mappedIngredients / totalIngredients) * 100) : 0;

      return {
        component: 'Ingredient Mappings',
        status: mappingPercentage >= 80 ? 'healthy' : mappingPercentage >= 50 ? 'warning' : 'error',
        message: `${mappingPercentage}% of recipe ingredients have inventory mappings (${mappedIngredients}/${totalIngredients})`,
        details: { 
          total: totalIngredients, 
          mapped: mappedIngredients, 
          percentage: mappingPercentage 
        }
      };
    } catch (error) {
      return {
        component: 'Ingredient Mappings',
        status: 'error',
        message: `Error checking ingredient mappings: ${(error as Error).message}`
      };
    }
  }
}
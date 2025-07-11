import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RepairResult {
  success: boolean;
  recipeId: string;
  recipeName: string;
  ingredientsAdded: number;
  error?: string;
}

export interface CatalogRepairResult {
  repaired_count: number;
  errors: string[];
}

/**
 * Repair deployed recipes that are missing ingredients
 */
export const repairDeployedRecipeIngredients = async (
  recipeIds?: string[]
): Promise<RepairResult[]> => {
  try {
    console.log('🔧 Starting recipe ingredients repair process...');
    
    // Get deployed recipes that have no ingredients
    let query = supabase
      .from('recipes')
      .select(`
        id,
        name,
        store_id,
        template_id,
        recipe_templates!inner(
          id,
          name,
          recipe_template_ingredients(*)
        )
      `)
      .not('template_id', 'is', null);

    if (recipeIds && recipeIds.length > 0) {
      query = query.in('id', recipeIds);
    }

    const { data: recipes, error: recipesError } = await query;
    if (recipesError) throw recipesError;

    const results: RepairResult[] = [];

    for (const recipe of recipes || []) {
      try {
        // Check if recipe already has ingredients
        const { data: existingIngredients } = await supabase
          .from('recipe_ingredients')
          .select('id')
          .eq('recipe_id', recipe.id)
          .limit(1);

        if (existingIngredients && existingIngredients.length > 0) {
          results.push({
            success: true,
            recipeId: recipe.id,
            recipeName: recipe.name,
            ingredientsAdded: 0
          });
          continue;
        }

        // Get template ingredients
        const templateIngredients = recipe.recipe_templates?.recipe_template_ingredients || [];
        
        if (templateIngredients.length === 0) {
          results.push({
            success: false,
            recipeId: recipe.id,
            recipeName: recipe.name,
            ingredientsAdded: 0,
            error: 'No template ingredients found'
          });
          continue;
        }

        // Create recipe ingredients from template
        const ingredientInserts = templateIngredients.map((ingredient: any) => ({
          recipe_id: recipe.id,
          ingredient_name: ingredient.ingredient_name,
          quantity: ingredient.quantity || 1,
          unit: ingredient.unit === 'portion' ? 'pieces' : ingredient.unit || 'pieces',
          cost_per_unit: ingredient.cost_per_unit || 0,
          commissary_item_id: ingredient.commissary_item_id,
          inventory_stock_id: null
        }));

        const { error: insertError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientInserts);

        if (insertError) throw insertError;

        results.push({
          success: true,
          recipeId: recipe.id,
          recipeName: recipe.name,
          ingredientsAdded: ingredientInserts.length
        });

      } catch (error) {
        results.push({
          success: false,
          recipeId: recipe.id,
          recipeName: recipe.name,
          ingredientsAdded: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalIngredients = results.reduce((sum, r) => sum + r.ingredientsAdded, 0);
    
    if (successCount > 0) {
      toast.success(`Repaired ${successCount} recipes with ${totalIngredients} ingredients`);
    }

    return results;
  } catch (error) {
    console.error('❌ Critical error in recipe repair:', error);
    toast.error('Failed to repair recipe ingredients');
    throw error;
  }
};

/**
 * Repair missing product catalog entries for deployed recipes
 */
export const repairMissingProductCatalogEntries = async (): Promise<CatalogRepairResult> => {
  try {
    console.log('🔧 Starting repair of missing product catalog entries...');
    
    const { data, error } = await supabase.rpc('repair_missing_product_catalog_entries');
    
    if (error) {
      console.error('❌ Repair function error:', error);
      throw error;
    }
    
    const result = data[0] as CatalogRepairResult;
    
    console.log('✅ Repair completed:', result);
    
    if (result.repaired_count > 0) {
      toast.success(`Successfully repaired ${result.repaired_count} missing product catalog entries`);
    } else {
      toast.info('No missing product catalog entries found');
    }
    
    if (result.errors.length > 0) {
      console.warn('⚠️ Repair errors:', result.errors);
      toast.warning(`${result.errors.length} items had errors during repair`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error running repair function:', error);
    toast.error('Failed to repair missing product catalog entries');
    return { repaired_count: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
  }
};

/**
 * Check how many recipes are missing product catalog entries
 */
export const checkMissingProductCatalogEntries = async (): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        id,
        name,
        store_id,
        product_catalog!left(id)
      `)
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .is('product_catalog.id', null);
    
    if (error) throw error;
    
    return data?.length || 0;
  } catch (error) {
    console.error('Error checking missing product catalog entries:', error);
    return 0;
  }
};

/**
 * Get list of recipes missing product catalog entries for inspection
 */
export const getMissingProductCatalogEntries = async () => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        id,
        name,
        store_id,
        total_cost,
        suggested_price,
        created_at,
        stores!inner(name)
      `)
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .not('id', 'in', `(
        SELECT recipe_id 
        FROM product_catalog 
        WHERE recipe_id IS NOT NULL
      )`);
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error getting missing product catalog entries:', error);
    return [];
  }
};
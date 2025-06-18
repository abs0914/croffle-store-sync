
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  errors: string[];
  rollbackData?: any[];
}

export interface RecipeToProductMapping {
  recipeId: string;
  recipeName: string;
  storeId: string;
  suggestedPrice: number;
  ingredients: Array<{
    inventoryStockId: string;
    requiredQuantity: number;
    unit: string;
  }>;
}

/**
 * Phase 1: Validate existing data structure and identify migration candidates
 */
export const validateDataForMigration = async (): Promise<{
  recipesNeedingMigration: RecipeToProductMapping[];
  existingProducts: number;
  validationErrors: string[];
}> => {
  try {
    console.log('Starting data validation for migration...');
    
    // Check existing products to avoid duplicates
    const { data: existingProducts, error: productsError } = await supabase
      .from('product_catalog')
      .select('id, product_name, store_id, recipe_id');

    if (productsError) throw productsError;

    // Get recipes that don't have corresponding products
    const { data: unmappedRecipes, error: recipesError } = await supabase
      .from('recipes')
      .select(`
        id,
        name,
        store_id,
        total_cost,
        is_active,
        approval_status,
        ingredients:recipe_ingredients(
          inventory_stock_id,
          quantity,
          unit
        )
      `)
      .eq('is_active', true)
      .eq('approval_status', 'approved');

    if (recipesError) throw recipesError;

    const existingProductRecipeIds = new Set(
      existingProducts?.map(p => p.recipe_id).filter(Boolean) || []
    );

    const recipesNeedingMigration: RecipeToProductMapping[] = [];
    const validationErrors: string[] = [];

    for (const recipe of unmappedRecipes || []) {
      if (existingProductRecipeIds.has(recipe.id)) {
        continue; // Skip already migrated recipes
      }

      // Validate recipe has ingredients
      if (!recipe.ingredients || recipe.ingredients.length === 0) {
        validationErrors.push(`Recipe "${recipe.name}" has no ingredients defined`);
        continue;
      }

      // Calculate suggested price (cost + 50% markup)
      const totalCost = recipe.total_cost || 0;
      const suggestedPrice = totalCost * 1.5;

      recipesNeedingMigration.push({
        recipeId: recipe.id,
        recipeName: recipe.name,
        storeId: recipe.store_id,
        suggestedPrice,
        ingredients: recipe.ingredients.map(ing => ({
          inventoryStockId: ing.inventory_stock_id,
          requiredQuantity: ing.quantity,
          unit: ing.unit
        }))
      });
    }

    return {
      recipesNeedingMigration,
      existingProducts: existingProducts?.length || 0,
      validationErrors
    };
  } catch (error) {
    console.error('Error validating data for migration:', error);
    throw error;
  }
};

/**
 * Phase 2: Migrate approved recipes to Product Catalog
 */
export const migrateRecipesToProducts = async (
  recipes: RecipeToProductMapping[],
  dryRun: boolean = false
): Promise<MigrationResult> => {
  const errors: string[] = [];
  const rollbackData: any[] = [];
  let migratedCount = 0;

  try {
    console.log(`Starting migration of ${recipes.length} recipes (dry run: ${dryRun})`);

    for (const recipe of recipes) {
      try {
        if (dryRun) {
          console.log(`[DRY RUN] Would migrate recipe: ${recipe.recipeName}`);
          migratedCount++;
          continue;
        }

        // Create product in catalog
        const { data: product, error: productError } = await supabase
          .from('product_catalog')
          .insert({
            store_id: recipe.storeId,
            recipe_id: recipe.recipeId,
            product_name: recipe.recipeName,
            description: `Migrated from recipe: ${recipe.recipeName}`,
            price: recipe.suggestedPrice,
            is_available: true,
            display_order: 0
          })
          .select()
          .single();

        if (productError) throw productError;

        rollbackData.push({
          type: 'product',
          id: product.id,
          data: product
        });

        // Create product ingredients mapping
        const ingredientMappings = recipe.ingredients.map(ing => ({
          product_catalog_id: product.id,
          inventory_stock_id: ing.inventoryStockId,
          required_quantity: ing.requiredQuantity,
          unit: ing.unit
        }));

        const { data: ingredients, error: ingredientsError } = await supabase
          .from('product_ingredients')
          .insert(ingredientMappings)
          .select();

        if (ingredientsError) throw ingredientsError;

        rollbackData.push({
          type: 'ingredients',
          productId: product.id,
          data: ingredients
        });

        migratedCount++;
        console.log(`Successfully migrated recipe: ${recipe.recipeName}`);

      } catch (error) {
        const errorMsg = `Failed to migrate recipe ${recipe.recipeName}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    const success = errors.length === 0;
    
    if (!dryRun) {
      if (success) {
        toast.success(`Successfully migrated ${migratedCount} recipes to Product Catalog`);
      } else {
        toast.error(`Migration completed with ${errors.length} errors`);
      }
    }

    return {
      success,
      migratedCount,
      errors,
      rollbackData: dryRun ? undefined : rollbackData
    };

  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      migratedCount,
      errors: [...errors, `Critical error: ${error}`],
      rollbackData
    };
  }
};

/**
 * Phase 3: Rollback migration if needed
 */
export const rollbackMigration = async (rollbackData: any[]): Promise<boolean> => {
  try {
    console.log('Starting migration rollback...');

    // Rollback in reverse order
    for (const item of rollbackData.reverse()) {
      if (item.type === 'ingredients') {
        await supabase
          .from('product_ingredients')
          .delete()
          .eq('product_catalog_id', item.productId);
      } else if (item.type === 'product') {
        await supabase
          .from('product_catalog')
          .delete()
          .eq('id', item.id);
      }
    }

    toast.success('Migration rollback completed successfully');
    return true;
  } catch (error) {
    console.error('Rollback failed:', error);
    toast.error('Migration rollback failed');
    return false;
  }
};

/**
 * Phase 4: Validate migrated data integrity
 */
export const validateMigrationIntegrity = async (): Promise<{
  isValid: boolean;
  issues: string[];
  productCount: number;
  ingredientMappingCount: number;
}> => {
  try {
    const issues: string[] = [];

    // Check products have corresponding recipes
    const { data: products } = await supabase
      .from('product_catalog')
      .select('id, product_name, recipe_id, store_id');

    const { data: ingredients } = await supabase
      .from('product_ingredients')
      .select('product_catalog_id, inventory_stock_id');

    const productCount = products?.length || 0;
    const ingredientMappingCount = ingredients?.length || 0;

    // Validate each product has ingredients
    for (const product of products || []) {
      const productIngredients = ingredients?.filter(
        ing => ing.product_catalog_id === product.id
      );

      if (!productIngredients || productIngredients.length === 0) {
        issues.push(`Product "${product.product_name}" has no ingredient mappings`);
      }
    }

    // Check for orphaned ingredients
    const productIds = new Set(products?.map(p => p.id) || []);
    const orphanedIngredients = ingredients?.filter(
      ing => !productIds.has(ing.product_catalog_id)
    );

    if (orphanedIngredients && orphanedIngredients.length > 0) {
      issues.push(`Found ${orphanedIngredients.length} orphaned ingredient mappings`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      productCount,
      ingredientMappingCount
    };
  } catch (error) {
    console.error('Error validating migration integrity:', error);
    return {
      isValid: false,
      issues: [`Validation error: ${error}`],
      productCount: 0,
      ingredientMappingCount: 0
    };
  }
};

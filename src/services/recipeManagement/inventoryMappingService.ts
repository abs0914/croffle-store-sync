import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Store-specific inventory mapping service
 * Handles cross-store inventory mapping issues in recipe deployments
 */

export interface InventoryMappingValidation {
  isValid: boolean;
  crossStoreMappings: Array<{
    recipeId: string;
    recipeName: string;
    ingredientName: string;
    wrongStoreId: string;
    correctStoreId: string;
    inventoryItemName: string;
  }>;
  missingMappings: Array<{
    recipeId: string;
    recipeName: string;
    ingredientName: string;
    storeId: string;
  }>;
}

export interface MappingFixResult {
  fixed: number;
  failed: number;
  details: Array<{
    recipeId: string;
    ingredientName: string;
    action: 'fixed' | 'failed' | 'created_item';
    error?: string;
  }>;
}

/**
 * Enhanced ingredient name matching with fuzzy logic and store context
 */
export const findStoreSpecificInventoryItem = async (
  ingredientName: string, 
  storeId: string
): Promise<{ id: string; item: string; } | null> => {
  const cleanIngredientName = ingredientName.toLowerCase().trim();
  
  // Try exact match first
  const { data: exactMatch } = await supabase
    .from('inventory_stock')
    .select('id, item')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .ilike('item', cleanIngredientName)
    .maybeSingle();

  if (exactMatch) return exactMatch;

  // Try fuzzy matching
  const { data: allStoreItems } = await supabase
    .from('inventory_stock')
    .select('id, item')
    .eq('store_id', storeId)
    .eq('is_active', true);

  if (!allStoreItems) return null;

  // Enhanced fuzzy matching logic
  for (const item of allStoreItems) {
    const itemName = item.item.toLowerCase().trim();
    
    // Remove common prefixes/suffixes for matching
    const cleanItemName = itemName
      .replace(/^(regular|mini|small|large|jumbo|fresh|frozen)\s+/i, '')
      .replace(/\s+(sauce|syrup|powder|mix|crushed|whole)$/i, '');
    
    const cleanIngredient = cleanIngredientName
      .replace(/^(regular|mini|small|large|jumbo|fresh|frozen)\s+/i, '')
      .replace(/\s+(sauce|syrup|powder|mix|crushed|whole)$/i, '');

    // Check for various match types
    if (
      cleanItemName.includes(cleanIngredient) ||
      cleanIngredient.includes(cleanItemName) ||
      // Handle word variations and plural/singular
      cleanItemName.replace(/s$/, '') === cleanIngredient.replace(/s$/, '') ||
      // Handle "oreo" vs "crushed oreo" cases
      (cleanItemName.includes('oreo') && cleanIngredient.includes('oreo'))
    ) {
      console.log(`🔍 Fuzzy match found: "${ingredientName}" -> "${item.item}"`);
      return item;
    }
  }

  return null;
};

/**
 * Validate inventory mappings for cross-store issues
 */
export const validateInventoryMappings = async (storeId?: string): Promise<InventoryMappingValidation> => {
  try {
    console.log('🔍 Validating inventory mappings for cross-store issues...');

    // Get all unified recipe ingredients with their inventory mappings
    const { data: ingredients, error } = await supabase
      .from('unified_recipe_ingredients')
      .select(`
        id,
        recipe_id,
        ingredient_name,
        inventory_stock_id
      `);

    if (error) throw error;
    if (!ingredients) return { isValid: true, crossStoreMappings: [], missingMappings: [] };

    // Get recipe details separately
    const recipeIds = [...new Set(ingredients.map(i => i.recipe_id))];
    const { data: recipes, error: recipesError } = await supabase
      .from('unified_recipes')
      .select('id, name, store_id, is_active')
      .in('id', recipeIds)
      .eq('is_active', true);

    if (recipesError) throw recipesError;
    
    // Filter by storeId if provided
    const filteredRecipes = storeId 
      ? recipes?.filter(r => r.store_id === storeId) 
      : recipes;

    // Get inventory stock details for ingredients that have mappings
    const inventoryIds = ingredients
      .filter(i => i.inventory_stock_id)
      .map(i => i.inventory_stock_id);
    
    const { data: inventoryItems, error: inventoryError } = inventoryIds.length > 0 
      ? await supabase
          .from('inventory_stock')
          .select('id, item, store_id')
          .in('id', inventoryIds)
      : { data: [], error: null };

    if (inventoryError) throw inventoryError;

    const crossStoreMappings = [];
    const missingMappings = [];

    for (const ingredient of ingredients) {
      const recipe = filteredRecipes?.find(r => r.id === ingredient.recipe_id);
      if (!recipe) continue;

      const inventoryItem = inventoryItems?.find(inv => inv.id === ingredient.inventory_stock_id);

      // Check for cross-store mapping
      if (inventoryItem && inventoryItem.store_id !== recipe.store_id) {
        crossStoreMappings.push({
          recipeId: recipe.id,
          recipeName: recipe.name,
          ingredientName: ingredient.ingredient_name,
          wrongStoreId: inventoryItem.store_id,
          correctStoreId: recipe.store_id,
          inventoryItemName: inventoryItem.item
        });
      }

      // Check for missing mappings (ingredient has inventory_stock_id but no actual inventory item found)
      if (!inventoryItem && ingredient.inventory_stock_id) {
        missingMappings.push({
          recipeId: recipe.id,
          recipeName: recipe.name,
          ingredientName: ingredient.ingredient_name,
          storeId: recipe.store_id
        });
      }
    }

    console.log(`📊 Validation results: ${crossStoreMappings.length} cross-store mappings, ${missingMappings.length} missing mappings`);

    return {
      isValid: crossStoreMappings.length === 0 && missingMappings.length === 0,
      crossStoreMappings,
      missingMappings
    };

  } catch (error) {
    console.error('Error validating inventory mappings:', error);
    return { isValid: false, crossStoreMappings: [], missingMappings: [] };
  }
};

/**
 * Fix cross-store inventory mappings
 */
export const fixCrossStoreMappings = async (storeId?: string): Promise<MappingFixResult> => {
  try {
    console.log('🔧 Fixing cross-store inventory mappings...');

    const validation = await validateInventoryMappings(storeId);
    const fixResults: MappingFixResult = {
      fixed: 0,
      failed: 0,
      details: []
    };

    // Fix cross-store mappings
    for (const mapping of validation.crossStoreMappings) {
      try {
        console.log(`🔧 Fixing cross-store mapping: ${mapping.ingredientName} in ${mapping.recipeName}`);

        // Find equivalent inventory item in correct store
        const correctInventoryItem = await findStoreSpecificInventoryItem(
          mapping.ingredientName,
          mapping.correctStoreId
        );

        if (correctInventoryItem) {
          // Update the mapping to point to correct store's inventory
          const { error } = await supabase
            .from('unified_recipe_ingredients')
            .update({ inventory_stock_id: correctInventoryItem.id })
            .eq('recipe_id', mapping.recipeId)
            .eq('ingredient_name', mapping.ingredientName);

          if (error) throw error;

          fixResults.fixed++;
          fixResults.details.push({
            recipeId: mapping.recipeId,
            ingredientName: mapping.ingredientName,
            action: 'fixed'
          });

          console.log(`✅ Fixed mapping: ${mapping.ingredientName} -> ${correctInventoryItem.item}`);
        } else {
          // Create missing inventory item in target store
          const { data: newInventoryItem, error: createError } = await supabase
            .from('inventory_stock')
            .insert({
              store_id: mapping.correctStoreId,
              item: mapping.inventoryItemName,
              unit: 'pieces',
              stock_quantity: 0,
              minimum_threshold: 1,
              is_active: true
            })
            .select()
            .single();

          if (createError) throw createError;

          // Update mapping to point to new item
          const { error: updateError } = await supabase
            .from('unified_recipe_ingredients')
            .update({ inventory_stock_id: newInventoryItem.id })
            .eq('recipe_id', mapping.recipeId)
            .eq('ingredient_name', mapping.ingredientName);

          if (updateError) throw updateError;

          fixResults.fixed++;
          fixResults.details.push({
            recipeId: mapping.recipeId,
            ingredientName: mapping.ingredientName,
            action: 'created_item'
          });

          console.log(`✅ Created new inventory item and fixed mapping: ${mapping.ingredientName}`);
        }
      } catch (error) {
        console.error(`❌ Failed to fix mapping for ${mapping.ingredientName}:`, error);
        fixResults.failed++;
        fixResults.details.push({
          recipeId: mapping.recipeId,
          ingredientName: mapping.ingredientName,
          action: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Fix missing mappings
    for (const missing of validation.missingMappings) {
      try {
        console.log(`🔧 Fixing missing mapping: ${missing.ingredientName} in ${missing.recipeName}`);

        const inventoryItem = await findStoreSpecificInventoryItem(
          missing.ingredientName,
          missing.storeId
        );

        if (inventoryItem) {
          const { error } = await supabase
            .from('unified_recipe_ingredients')
            .update({ inventory_stock_id: inventoryItem.id })
            .eq('recipe_id', missing.recipeId)
            .eq('ingredient_name', missing.ingredientName);

          if (error) throw error;

          fixResults.fixed++;
          fixResults.details.push({
            recipeId: missing.recipeId,
            ingredientName: missing.ingredientName,
            action: 'fixed'
          });
        }
      } catch (error) {
        console.error(`❌ Failed to fix missing mapping for ${missing.ingredientName}:`, error);
        fixResults.failed++;
        fixResults.details.push({
          recipeId: missing.recipeId,
          ingredientName: missing.ingredientName,
          action: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`✅ Mapping fix completed: ${fixResults.fixed} fixed, ${fixResults.failed} failed`);

    if (fixResults.fixed > 0) {
      toast.success(`Fixed ${fixResults.fixed} cross-store inventory mappings!`);
    }

    if (fixResults.failed > 0) {
      toast.warning(`Fixed ${fixResults.fixed} mappings, but ${fixResults.failed} failed to fix`);
    }

    return fixResults;

  } catch (error) {
    console.error('Error fixing cross-store mappings:', error);
    toast.error('Failed to fix cross-store mappings');
    return { fixed: 0, failed: 0, details: [] };
  }
};

/**
 * Prevent cross-store mappings during recipe deployment
 */
export const validateDeploymentMappings = async (
  ingredients: any[],
  targetStoreId: string
): Promise<{ 
  validIngredients: any[];
  warnings: string[];
}> => {
  const validIngredients = [];
  const warnings = [];

  for (const ingredient of ingredients) {
    let validIngredient = { ...ingredient };

    // If ingredient has inventory_stock_id, validate it belongs to target store
    if (ingredient.inventory_stock_id) {
      const { data: inventoryItem } = await supabase
        .from('inventory_stock')
        .select('id, item, store_id')
        .eq('id', ingredient.inventory_stock_id)
        .single();

      if (inventoryItem && inventoryItem.store_id !== targetStoreId) {
        // Cross-store mapping detected - find correct item
        console.log(`⚠️ Cross-store mapping detected for ${ingredient.ingredient_name}: wrong store ${inventoryItem.store_id}, should be ${targetStoreId}`);
        
        const correctItem = await findStoreSpecificInventoryItem(
          ingredient.ingredient_name,
          targetStoreId
        );

        if (correctItem) {
          validIngredient.inventory_stock_id = correctItem.id;
          console.log(`✅ Fixed cross-store mapping: ${ingredient.ingredient_name} -> ${correctItem.item}`);
        } else {
          validIngredient.inventory_stock_id = null;
          warnings.push(`No inventory item found for "${ingredient.ingredient_name}" in target store`);
        }
      }
    }

    // If no valid inventory mapping, try to find one
    if (!validIngredient.inventory_stock_id) {
      const storeItem = await findStoreSpecificInventoryItem(
        ingredient.ingredient_name,
        targetStoreId
      );

      if (storeItem) {
        validIngredient.inventory_stock_id = storeItem.id;
        console.log(`🔗 Found store inventory match for "${ingredient.ingredient_name}": ${storeItem.item}`);
      } else {
        warnings.push(`No inventory mapping available for "${ingredient.ingredient_name}"`);
      }
    }

    validIngredients.push(validIngredient);
  }

  return { validIngredients, warnings };
};

/**
 * Standardize inventory across stores for common ingredients
 */
export const standardizeInventoryAcrossStores = async (): Promise<{
  created: number;
  updated: number;
  errors: string[];
}> => {
  try {
    console.log('🔄 Standardizing inventory across stores...');

    // Get all unique ingredient names from recipe ingredients
    const { data: uniqueIngredients } = await supabase
      .from('unified_recipe_ingredients')
      .select('ingredient_name')
      .not('ingredient_name', 'is', null);

    if (!uniqueIngredients) return { created: 0, updated: 0, errors: [] };

    const ingredientNames = [...new Set(uniqueIngredients.map(i => i.ingredient_name))];
    
    // Get all stores
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name')
      .eq('is_active', true);

    if (!stores) return { created: 0, updated: 0, errors: [] };

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const ingredientName of ingredientNames) {
      // Find stores that have this ingredient
      const { data: existingItems } = await supabase
        .from('inventory_stock')
        .select('store_id, item, unit, stock_quantity')
        .ilike('item', `%${ingredientName}%`)
        .eq('is_active', true);

      if (!existingItems || existingItems.length === 0) continue;

      // Use the most common version as the standard
      const standardItem = existingItems[0];

      // Create missing inventory items in stores that don't have it
      for (const store of stores) {
        const storeHasItem = existingItems.some(item => item.store_id === store.id);

        if (!storeHasItem) {
          try {
            const { error } = await supabase
              .from('inventory_stock')
              .insert({
                store_id: store.id,
                item: standardItem.item,
                unit: standardItem.unit,
                stock_quantity: 0,
                minimum_threshold: 1,
                is_active: true
              });

            if (error) throw error;
            
            created++;
            console.log(`✅ Created "${standardItem.item}" in ${store.name}`);
          } catch (error) {
            const errorMsg = `Failed to create ${standardItem.item} in ${store.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(errorMsg);
            console.error('❌', errorMsg);
          }
        }
      }
    }

    console.log(`✅ Inventory standardization completed: ${created} items created, ${errors.length} errors`);

    if (created > 0) {
      toast.success(`Created ${created} missing inventory items across stores`);
    }

    return { created, updated, errors };

  } catch (error) {
    console.error('Error standardizing inventory:', error);
    return { created: 0, updated: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
  }
};
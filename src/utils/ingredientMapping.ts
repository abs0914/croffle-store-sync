// Ingredient Mapping Utilities - Comprehensive Solution for Mapping Persistence

export interface IngredientVariant {
  originalName: string;
  normalizedName: string;
  variants: string[];
  confidence: number;
}

export interface MappingDiagnostics {
  ingredientName: string;
  recipeIngredients: Array<{
    id: string;
    recipe_id: string;
    ingredient_name: string;
    inventory_stock_id: string | null;
    store_id: string;
  }>;
  mappingRecords: Array<{
    recipe_id: string;
    ingredient_name: string;
    inventory_stock_id: string | null;
  }>;
  nameVariants: string[];
  consistencyIssues: string[];
  recommendations: string[];
}

// Name normalization for variant detection
export const normalizeIngredientName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .replace(/\b(chopped|diced|sliced|fresh|dried|powdered)\b/g, '')
    .replace(/\b(organic|natural|premium|regular)\b/g, '')
    .trim();
};

// Detect ingredient name variants
export const findIngredientVariants = (ingredientName: string, allIngredients: string[]): IngredientVariant => {
  const normalized = normalizeIngredientName(ingredientName);
  const variants: string[] = [];
  
  for (const ingredient of allIngredients) {
    if (ingredient === ingredientName) continue;
    
    const ingredientNormalized = normalizeIngredientName(ingredient);
    
    // Exact normalized match
    if (ingredientNormalized === normalized) {
      variants.push(ingredient);
      continue;
    }
    
    // Partial matches (both ways)
    if (ingredientNormalized.includes(normalized) || normalized.includes(ingredientNormalized)) {
      // Only include if substantial overlap (>50% of shorter string)
      const shorter = Math.min(ingredientNormalized.length, normalized.length);
      const overlap = Math.max(
        ingredientNormalized.split(' ').filter(word => normalized.includes(word)).join(' ').length,
        normalized.split(' ').filter(word => ingredientNormalized.includes(word)).join(' ').length
      );
      
      if (overlap / shorter > 0.5) {
        variants.push(ingredient);
      }
    }
  }
  
  return {
    originalName: ingredientName,
    normalizedName: normalized,
    variants,
    confidence: variants.length > 0 ? 0.8 : 1.0
  };
};

// Unified mapping status calculation
export const calculateMappingStatus = (
  ingredients: Array<{ mapped: boolean; inventoryId: string | null }>
): 'complete' | 'partial' | 'missing' => {
  const total = ingredients.length;
  if (total === 0) return 'missing';
  
  const mapped = ingredients.filter(i => i.mapped && i.inventoryId).length;
  
  if (mapped === 0) return 'missing';
  if (mapped === total) return 'complete';
  return 'partial';
};

// Comprehensive mapping diagnostics
export const generateMappingDiagnostics = async (
  productId: string,
  storeId: string,
  supabase: any
): Promise<MappingDiagnostics[]> => {
  const diagnostics: MappingDiagnostics[] = [];
  
  try {
    // Get all recipe ingredients for this product
    const { data: recipeIngredients, error: riError } = await supabase
      .from('recipe_ingredients')
      .select(`
        id,
        recipe_id,
        ingredient_name,
        inventory_stock_id,
        recipes!inner(
          id,
          product_id,
          store_id
        )
      `)
      .eq('recipes.product_id', productId)
      .eq('recipes.store_id', storeId);

    if (riError) throw riError;

    // Get mapping records
    const { data: mappingRecords, error: mappingError } = await supabase
      .from('recipe_ingredient_mappings')
      .select(`
        recipe_id,
        ingredient_name,
        inventory_stock_id,
        recipes!inner(
          product_id,
          store_id
        )
      `)
      .eq('recipes.product_id', productId)
      .eq('recipes.store_id', storeId);

    if (mappingError) throw mappingError;

    // Group by ingredient name (including variants)
    const ingredientGroups = new Map<string, {
      recipeIngredients: typeof recipeIngredients;
      mappingRecords: typeof mappingRecords;
      allNames: string[];
    }>();

    // First pass: collect all ingredient names
    const allIngredientNames = [
      ...new Set([
        ...(recipeIngredients || []).map(ri => ri.ingredient_name),
        ...(mappingRecords || []).map(mr => mr.ingredient_name)
      ])
    ];

    // Second pass: group by variants
    for (const ingredientName of allIngredientNames) {
      const variants = findIngredientVariants(ingredientName, allIngredientNames);
      const groupKey = variants.normalizedName;
      
      if (!ingredientGroups.has(groupKey)) {
        ingredientGroups.set(groupKey, {
          recipeIngredients: [],
          mappingRecords: [],
          allNames: []
        });
      }
      
      const group = ingredientGroups.get(groupKey)!;
      group.allNames.push(ingredientName);
      
      // Add related records
      group.recipeIngredients.push(
        ...(recipeIngredients || []).filter(ri => ri.ingredient_name === ingredientName)
      );
      group.mappingRecords.push(
        ...(mappingRecords || []).filter(mr => mr.ingredient_name === ingredientName)
      );
    }

    // Generate diagnostics for each group
    for (const [normalizedName, group] of ingredientGroups) {
      const consistencyIssues: string[] = [];
      const recommendations: string[] = [];

      // Check for consistency issues
      const uniqueInventoryIds = new Set(
        group.recipeIngredients
          .map(ri => ri.inventory_stock_id)
          .filter(id => id !== null)
      );

      if (uniqueInventoryIds.size > 1) {
        consistencyIssues.push(`Multiple inventory mappings detected (${uniqueInventoryIds.size} different items)`);
      }

      const recipeIngredientMapped = group.recipeIngredients.filter(ri => ri.inventory_stock_id).length;
      const mappingRecordMapped = group.mappingRecords.filter(mr => mr.inventory_stock_id).length;

      if (recipeIngredientMapped !== mappingRecordMapped) {
        consistencyIssues.push(`Mapping table out of sync (${recipeIngredientMapped} vs ${mappingRecordMapped})`);
      }

      if (group.allNames.length > 1) {
        consistencyIssues.push(`Name variants detected: ${group.allNames.join(', ')}`);
        recommendations.push('Consider standardizing ingredient names across recipes');
      }

      if (uniqueInventoryIds.size === 0 && group.recipeIngredients.length > 0) {
        recommendations.push('Map this ingredient to inventory for automatic deduction');
      }

      // Use the most common name as the primary name
      const primaryName = group.allNames.reduce((a, b) => 
        group.recipeIngredients.filter(ri => ri.ingredient_name === a).length >
        group.recipeIngredients.filter(ri => ri.ingredient_name === b).length ? a : b
      );

      diagnostics.push({
        ingredientName: primaryName,
        recipeIngredients: group.recipeIngredients,
        mappingRecords: group.mappingRecords,
        nameVariants: group.allNames,
        consistencyIssues,
        recommendations
      });
    }

  } catch (error) {
    console.error('Error generating mapping diagnostics:', error);
  }

  return diagnostics;
};

// Unified mapping update with variant resolution
export const updateIngredientMappingUnified = async (
  productId: string,
  ingredientName: string,
  inventoryId: string | null,
  storeId: string,
  supabase: any,
  options: {
    resolveVariants?: boolean;
    syncMappingTable?: boolean;
    skipVerification?: boolean;
  } = {}
): Promise<{
  success: boolean;
  updatedCount: number;
  errors: string[];
  warnings: string[];
}> => {
  console.log(`🔧 [UNIFIED UPDATE] Starting: ${ingredientName} → ${inventoryId ? 'mapped' : 'unmapped'} (productId: ${productId}, storeId: ${storeId})`);
  
  const errors: string[] = [];
  const warnings: string[] = [];
  let updatedCount = 0;

  try {
    // Get all recipe ingredients for this product in this store
    console.log(`📊 [QUERY] Fetching recipe ingredients for product ${productId} in store ${storeId}`);
    const { data: recipeIngredients, error: riError } = await supabase
      .from('recipe_ingredients')
      .select(`
        id,
        recipe_id,
        ingredient_name,
        inventory_stock_id,
        recipes!inner(
          id,
          product_id,
          store_id
        )
      `)
      .eq('recipes.product_id', productId)
      .eq('recipes.store_id', storeId);

    if (riError) {
      console.error(`❌ [ERROR] Failed to fetch recipe ingredients:`, riError);
      errors.push(`Failed to fetch recipe ingredients: ${riError.message}`);
      return { success: false, updatedCount: 0, errors, warnings };
    }

    console.log(`📝 [DATA] Found ${recipeIngredients?.length || 0} recipe ingredients`);
    if (!recipeIngredients || recipeIngredients.length === 0) {
      errors.push('No recipe ingredients found for this product');
      return { success: false, updatedCount: 0, errors, warnings };
    }

    // Find all ingredients to update (including variants if enabled)
    let targetIngredients = recipeIngredients.filter(ri => ri.ingredient_name === ingredientName);
    console.log(`🎯 [FILTER] Found ${targetIngredients.length} exact matches for "${ingredientName}"`);

    if (options.resolveVariants && targetIngredients.length > 0) {
      const allIngredientNames = recipeIngredients.map(ri => ri.ingredient_name);
      const variants = findIngredientVariants(ingredientName, allIngredientNames);
      
      if (variants.variants.length > 0) {
        const beforeCount = targetIngredients.length;
        targetIngredients = recipeIngredients.filter(ri => 
          ri.ingredient_name === ingredientName || variants.variants.includes(ri.ingredient_name)
        );
        console.log(`🔄 [VARIANTS] Expanded from ${beforeCount} to ${targetIngredients.length} ingredients, variants: ${variants.variants.join(', ')}`);
        warnings.push(`Resolving ${variants.variants.length} name variants: ${variants.variants.join(', ')}`);
      }
    }

    if (targetIngredients.length === 0) {
      console.warn(`⚠️ [WARNING] No matching ingredients found for "${ingredientName}"`);
      errors.push(`No matching ingredients found for "${ingredientName}"`);
      return { success: false, updatedCount: 0, errors, warnings };
    }

    // Verify inventory item if mapping is being set
    if (inventoryId) {
      console.log(`🔍 [VERIFY] Checking inventory item ${inventoryId} in store ${storeId}`);
      const { data: inventoryItem, error: invError } = await supabase
        .from('inventory_stock')
        .select('id, item')
        .eq('id', inventoryId)
        .eq('store_id', storeId)
        .single();

      if (invError || !inventoryItem) {
        console.error(`❌ [ERROR] Inventory verification failed:`, invError);
        errors.push(`Inventory item not found or not in selected store`);
        return { success: false, updatedCount: 0, errors, warnings };
      }
      console.log(`✅ [VERIFY] Inventory item verified: "${inventoryItem.item}"`);
    }

    // Update recipe ingredients - CRITICAL FIX: Batch update with returned row verification
    console.log(`💾 [UPDATE] Batch updating ${targetIngredients.length} recipe ingredient records`);
    const targetIds = targetIngredients.map(ri => ri.id);
    console.log(`🎯 [UNIFIED UPDATE] Target IDs: ${targetIds.length} records`);
    
    const { data: updatedRows, error: updateError } = await supabase
      .from('recipe_ingredients')
      .update({ inventory_stock_id: inventoryId })
      .in('id', targetIds)
      .select('id');

    if (updateError) {
      console.error(`❌ [ERROR] Batch update failed:`, updateError);
      errors.push(`Failed to update recipe ingredients: ${updateError.message}`);
    } else {
      updatedCount = updatedRows?.length || 0;
      console.log(`✅ [UNIFIED UPDATE] Successfully updated ${updatedCount}/${targetIds.length} records`);
      
      if (updatedCount < targetIds.length) {
        warnings.push(`Only ${updatedCount} of ${targetIds.length} records were updated - possible RLS or constraint issues`);
      }
    }

    // CRITICAL FIX: Sync mapping table for ALL variants
    if (options.syncMappingTable) {
      console.log(`🔄 [MAPPING] Syncing mapping table for all variants`);
      const uniqueRecipeIds = [...new Set(targetIngredients.map(ri => ri.recipe_id))];
      const uniqueIngredientNames = [...new Set(targetIngredients.map(ri => ri.ingredient_name))];
      
      console.log(`  📊 Recipes: ${uniqueRecipeIds.length}, Ingredient names: ${uniqueIngredientNames.length}`);
      
      for (const recipeId of uniqueRecipeIds) {
        for (const ingredientVariantName of uniqueIngredientNames) {
          if (inventoryId) {
            console.log(`  💾 Upserting mapping: recipe ${recipeId} + "${ingredientVariantName}" → ${inventoryId}`);
            const { data: upsertedRows, error: mappingError } = await supabase
              .from('recipe_ingredient_mappings')
              .upsert(
                {
                  recipe_id: recipeId,
                  ingredient_name: ingredientVariantName,
                  inventory_stock_id: inventoryId,
                  conversion_factor: 1.0
                },
                { onConflict: 'recipe_id,ingredient_name' }
              )
              .select('recipe_id, ingredient_name');
            
            if (mappingError) {
              console.error(`❌ [ERROR] Mapping upsert failed for ${recipeId}+"${ingredientVariantName}":`, mappingError);
              warnings.push(`Failed to sync mapping table for recipe ${recipeId}, ingredient "${ingredientVariantName}": ${mappingError.message}`);
            } else {
              const rowCount = upsertedRows?.length || 0;
              console.log(`  ✅ [MAPPING] Upserted ${rowCount} mapping record(s)`);
              if (rowCount === 0) {
                warnings.push(`Mapping upsert returned 0 rows for recipe ${recipeId}, ingredient "${ingredientVariantName}" - possible RLS issue`);
              }
            }
          } else {
            console.log(`  🗑️ Deleting mapping: recipe ${recipeId} + "${ingredientVariantName}"`);
            const { data: deletedRows, error: deleteError } = await supabase
              .from('recipe_ingredient_mappings')
              .delete()
              .eq('recipe_id', recipeId)
              .eq('ingredient_name', ingredientVariantName)
              .select('recipe_id, ingredient_name');
            
            if (deleteError) {
              console.error(`❌ [ERROR] Mapping delete failed for ${recipeId}+"${ingredientVariantName}":`, deleteError);
              warnings.push(`Failed to remove mapping for recipe ${recipeId}, ingredient "${ingredientVariantName}": ${deleteError.message}`);
            } else {
              const rowCount = deletedRows?.length || 0;
              console.log(`  ✅ [MAPPING] Deleted ${rowCount} mapping record(s)`);
              if (rowCount === 0) {
                console.warn(`⚠️ [MAPPING] Delete returned 0 rows for recipe ${recipeId}, ingredient "${ingredientVariantName}" - record may not have existed`);
              }
            }
          }
        }
      }
    }

    const result = {
      success: errors.length === 0,
      updatedCount,
      errors,
      warnings
    };

    console.log(`🏁 [COMPLETE] Update finished:`, result);
    return result;

  } catch (error) {
    console.error(`💥 [FATAL ERROR] Unexpected error during unified update:`, error);
    errors.push(`Unexpected error: ${error}`);
    return { success: false, updatedCount: 0, errors, warnings };
  }
};
import { supabase } from "@/integrations/supabase/client";

/**
 * Batch Inventory Deduction Service
 * 
 * Optimized for performance with:
 * - Batch processing of inventory updates
 * - Parallel recipe lookups 
 * - Timeout handling
 * - Minimal database round trips
 */

export interface BatchInventoryDeductionResult {
  success: boolean;
  deductedItems: Array<{
    inventoryId: string;
    itemName: string;
    quantityDeducted: number;
    newStock: number;
  }>;
  errors: string[];
  warnings: string[];
  processingTimeMs: number;
  itemsProcessed: number;
}

export interface BatchTransactionItem {
  product_id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

/**
 * Batch process inventory deduction with optimized database queries and parallel processing
 */
export const batchDeductInventoryForTransaction = async (
  transactionId: string,
  storeId: string,
  items: BatchTransactionItem[],
  timeoutMs: number = 30000 // 30 second timeout
): Promise<BatchInventoryDeductionResult> => {
  const startTime = Date.now();
  
  // 🔥 ENHANCED LOGGING - Phase 3: System Hardening
  console.log(`🚀 BATCH INVENTORY DEDUCTION STARTED`);
  console.log(`📋 Transaction ID: ${transactionId}`);
  console.log(`🏪 Store ID: ${storeId}`);  
  console.log(`📦 Items to process: ${items.length}`);
  console.log(`⏱️ Timeout: ${timeoutMs}ms`);
  console.log(`📄 Items:`, items.map(item => ({
    name: item.name,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price
  })));
  
  const result: BatchInventoryDeductionResult = {
    success: true,
    deductedItems: [],
    errors: [],
    warnings: [],
    processingTimeMs: 0,
    itemsProcessed: 0
  };

  try {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        console.error(`❌ TIMEOUT: Inventory deduction timed out after ${timeoutMs}ms`);
        reject(new Error(`Inventory deduction timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    // Main processing promise  
    const processingPromise = processBatchInventoryDeduction(transactionId, storeId, items, result);

    // Race between processing and timeout
    await Promise.race([processingPromise, timeoutPromise]);

    // 🔥 SUCCESS LOGGING
    console.log(`✅ BATCH INVENTORY DEDUCTION COMPLETED SUCCESSFULLY`);
    console.log(`📊 Final Results:`, {
      success: result.success,
      itemsProcessed: result.itemsProcessed,
      deductedItems: result.deductedItems.length,
      errors: result.errors.length,
      warnings: result.warnings.length,
      processingTimeMs: result.processingTimeMs
    });

  } catch (error) {
    // 🔥 COMPREHENSIVE ERROR LOGGING
    console.error(`❌ BATCH INVENTORY DEDUCTION CRITICAL FAILURE`);
    console.error(`🔥 Error Type:`, error?.constructor?.name || 'Unknown');
    console.error(`🔥 Error Message:`, error instanceof Error ? error.message : 'Unknown error');
    console.error(`🔥 Error Stack:`, error instanceof Error ? error.stack : 'No stack trace');
    console.error(`🔥 Transaction ID:`, transactionId);
    console.error(`🔥 Store ID:`, storeId);
    console.error(`🔥 Items Being Processed:`, items);
    console.error(`🔥 Current Result State:`, result);
    
    result.success = false;
    if (error instanceof Error && error.message.includes('timeout')) {
      result.errors.push(`❌ TIMEOUT: Processing timeout after ${timeoutMs}ms - transaction may be partially processed`);
    } else {
      result.errors.push(`❌ CRITICAL ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Log inventory sync failure
    try {
      await supabase.rpc('log_inventory_sync_result', {
        p_transaction_id: transactionId,
        p_sync_status: 'error',
        p_error_details: error instanceof Error ? error.message : 'Unknown error',
        p_items_processed: result.itemsProcessed,
        p_sync_duration_ms: Date.now() - startTime,
        p_affected_inventory_items: null
      });
    } catch (logError) {
      console.error(`🔥 FAILED TO LOG SYNC ERROR:`, logError);
    }
  }

  result.processingTimeMs = Date.now() - startTime;
  
  console.log(`⏱️ TOTAL PROCESSING TIME: ${result.processingTimeMs}ms`);
  console.log(`📊 FINAL SUMMARY:`, {
    success: result.success,
    deductedItems: result.deductedItems.length,
    errors: result.errors.length,
    warnings: result.warnings.length,
    itemsProcessed: result.itemsProcessed
  });
  
  // Log successful sync result
  if (result.success && result.errors.length === 0) {
    try {
      await supabase.rpc('log_inventory_sync_result', {
        p_transaction_id: transactionId,
        p_sync_status: 'success',
        p_error_details: null,
        p_items_processed: result.itemsProcessed,
        p_sync_duration_ms: result.processingTimeMs,
        p_affected_inventory_items: result.deductedItems
      });
      console.log(`✅ SYNC RESULT LOGGED SUCCESSFULLY`);
    } catch (logError) {
      console.error(`🔥 FAILED TO LOG SYNC SUCCESS:`, logError);
    }
  }
  
  return result;
};

/**
 * Core batch processing logic with optimized database operations
 */
async function processBatchInventoryDeduction(
  transactionId: string,
  storeId: string,
  items: BatchTransactionItem[],
  result: BatchInventoryDeductionResult
): Promise<void> {
  
  // Step 1: Batch fetch all recipes and ingredients in parallel
  console.log('🔍 Step 1: Batch fetching recipes and ingredients...');
  
  const productIds = items.filter(item => item.product_id).map(item => item.product_id!);
  const productNames = items.map(item => item.name);
  
  let recipes: any[] = [];
  let recipeTemplates: any[] = [];
  let storeInventoryItems: any[] = [];

  // Fetch recipes by product_id and by name in parallel
  const [recipesResult, templatesResult, inventoryResult] = await Promise.all([
    // Fetch recipes via product_catalog relationship
    productIds.length > 0 ? supabase
      .from('product_catalog')
      .select(`
        id,
        product_name,
        recipe_id,
        recipes!inner (
          id,
          name,
          product_id,
          recipe_ingredients (
            ingredient_name,
            quantity,
            inventory_stock_id,
            inventory_stock (
              id,
              item,
              stock_quantity
            )
          )
        )
      `)
      .in('id', productIds)
      .eq('store_id', storeId)
      .eq('is_available', true) : Promise.resolve({ data: [], error: null }),
    
    // Fetch recipe templates by name as fallback
    supabase
      .from('recipe_templates')
      .select(`
        id,
        name,
        recipe_template_ingredients (
          ingredient_name,
          quantity
        )
      `)
      .in('name', productNames)
      .eq('is_active', true),
    
    // Fetch store inventory items for template mapping
    supabase
      .from('inventory_stock')
      .select('id, item, stock_quantity')
      .eq('store_id', storeId)
      .eq('is_active', true)
  ]);

  if (recipesResult.error) {
    console.error('❌ Error fetching recipes:', recipesResult.error);
    result.errors.push(`Error fetching recipes: ${recipesResult.error.message}`);
  } else {
    recipes = recipesResult.data || [];
  }

  if (templatesResult.error) {
    console.error('❌ Error fetching recipe templates:', templatesResult.error);
    result.warnings.push(`Error fetching recipe templates: ${templatesResult.error.message}`);
  } else {
    recipeTemplates = templatesResult.data || [];
  }

  if (inventoryResult.error) {
    console.error('❌ Error fetching store inventory:', inventoryResult.error);
    result.warnings.push(`Error fetching store inventory: ${inventoryResult.error.message}`);
  } else {
    storeInventoryItems = inventoryResult.data || [];
  }

  console.log(`📋 Found ${recipes.length} recipes, ${recipeTemplates.length} recipe templates, and ${storeInventoryItems.length} inventory items`);

  // Step 2: Build inventory deduction plan
  console.log('📝 Step 2: Building deduction plan...');
  
  const inventoryUpdates = new Map<string, {
    inventoryId: string;
    itemName: string;
    currentStock: number;
    totalDeduction: number;
    newStock: number;
    transactions: Array<{ transactionId: string; itemName: string; quantity: number; }>;
  }>();

  const inventoryMovements: Array<{
    inventory_stock_id: string;
    movement_type: 'sale';
    quantity_change: number;
    previous_quantity: number;
    new_quantity: number;
    reference_type: 'transaction';
    reference_id: string;
    notes: string;
    created_by: string;
  }> = [];

  // Get current user for audit trail
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  for (const item of items) {
    result.itemsProcessed++;
    
    // Find recipe via product_catalog relationship
    const catalogEntry = recipes.find(pc => pc.id === item.product_id);
    const recipe = catalogEntry?.recipes;
    
    if (!recipe && item.name) {
      // ENHANCED FALLBACK CHAIN for NULL recipe_id products
      console.log(`⚠️ No recipe found via product_catalog for ${item.name} (product_id: ${item.product_id})`);
      
      // Try to find by name match in catalog first (case-insensitive)
      const catalogByName = recipes.find(pc => 
        pc.product_name.toLowerCase().trim() === item.name.toLowerCase().trim()
      );
      const recipeByName = catalogByName?.recipes;
      
      if (recipeByName) {
        console.log(`🔄 Found recipe via product name match for ${item.name}`);
        // Process the recipe normally using the name-matched recipe
        const processedDirectly = await processRecipeIngredients(
          recipeByName,
          item,
          transactionId,
          userId || 'system',
          inventoryUpdates,
          inventoryMovements,
          result
        );
        
        if (processedDirectly) {
          result.itemsProcessed++;
        }
        continue; // Continue to next item after processing recipe
      }
      
      // Try fuzzy name matching for common variations
      const fuzzyMatch = recipes.find(pc => {
        const productName = pc.product_name.toLowerCase().trim();
        const itemName = item.name.toLowerCase().trim();
        
        // Handle common croffle variations
        if ((itemName.includes('mini croffle') && productName.includes('mini croffle')) ||
            (itemName.includes('croffle overload') && productName.includes('croffle overload')) ||
            (itemName.includes('croffle') && productName.includes('croffle'))) {
          return true;
        }
        
        // Handle other common product name variations
        const itemWords = itemName.split(' ');
        const productWords = productName.split(' ');
        const commonWords = itemWords.filter(word => productWords.some(pWord => pWord.includes(word) || word.includes(pWord)));
        
        return commonWords.length >= Math.min(itemWords.length, productWords.length) * 0.7; // 70% word match
      });
      
      if (fuzzyMatch?.recipes) {
        console.log(`🔄 Found recipe via fuzzy name match: "${item.name}" → "${fuzzyMatch.product_name}"`);
        result.warnings.push(`Used fuzzy name matching for ${item.name} → ${fuzzyMatch.product_name}`);
        
        const processedFuzzy = await processRecipeIngredients(
          fuzzyMatch.recipes,
          item,
          transactionId,
          userId || 'system',
          inventoryUpdates,
          inventoryMovements,
          result
        );
        
        if (processedFuzzy) {
          result.itemsProcessed++;
        }
        continue; // Continue to next item after processing recipe
      }
      
      // FINAL FALLBACK: Try recipe template with enhanced matching
      const template = recipeTemplates.find(t => {
        const templateName = t.name.toLowerCase().trim();
        const itemName = item.name.toLowerCase().trim();
        
        // Exact match first
        if (templateName === itemName) return true;
        
        // Common croffle template variations
        if ((itemName.includes('mini croffle') && templateName.includes('mini croffle')) ||
            (itemName.includes('croffle overload') && templateName.includes('croffle overload'))) {
          return true;
        }
        
        return false;
      });
      
      if (template) {
        console.log(`🔄 FALLBACK: Using recipe template for ${item.name} - no store-specific recipe found`);
        result.warnings.push(`FALLBACK: Using recipe template for ${item.name} - store recipe missing or not linked`);
        
        // Process template ingredients with inventory mapping
        const templateSuccess = await processTemplateIngredients(
          template,
          item,
          storeInventoryItems,
          transactionId,
          userId || 'system',
          inventoryUpdates,
          inventoryMovements,
          result
        );
        
        if (templateSuccess) {
          result.itemsProcessed++;
        }
        continue; // Continue to next item after processing template
      }
      
      // Complete failure - no recipe or template found
      console.error(`❌ CRITICAL: No recipe or template found for ${item.name} (product_id: ${item.product_id})`);
      result.errors.push(`CRITICAL: No recipe or template found for ${item.name} - inventory cannot be deducted`);
    }

    if (!recipe || !recipe.recipe_ingredients || recipe.recipe_ingredients.length === 0) {
      result.warnings.push(`No recipe or ingredients found for ${item.name} (${item.product_id || 'no ID'})`);
      continue;
    }

    console.log(`🧪 Processing recipe: ${recipe.name} with ${recipe.recipe_ingredients.length} ingredients`);

    // Process recipe ingredients using dedicated function with enhanced fallback
    const processedRecipe = await processRecipeIngredientsWithFallback(
      recipe,
      item,
      transactionId,
      userId || 'system',
      inventoryUpdates,
      inventoryMovements,
      result,
      storeId
    );
    
    if (processedRecipe) {
      result.itemsProcessed++;
    }
  }

  // Step 3: Execute batch updates with transaction safety
  console.log(`🔄 Step 3: Executing ${inventoryUpdates.size} batch inventory updates...`);
  
  if (inventoryUpdates.size === 0) {
    result.warnings.push('No inventory items to update');
    return;
  }

  // Prepare batch update data
  const stockUpdates = Array.from(inventoryUpdates.values()).map(update => ({
    id: update.inventoryId,
    stock_quantity: update.newStock,
    updated_at: new Date().toISOString()
  }));

  // Execute updates in batches to avoid query size limits
  const BATCH_SIZE = 50;
  const updatePromises: Promise<any>[] = [];

  for (let i = 0; i < stockUpdates.length; i += BATCH_SIZE) {
    const batch = stockUpdates.slice(i, i + BATCH_SIZE);
    
    const updatePromise = Promise.all(batch.map(async (update) => {
      const { error } = await supabase
        .from('inventory_stock')
        .update({
          stock_quantity: update.stock_quantity,
          updated_at: update.updated_at
        })
        .eq('id', update.id);
      
      if (error) {
        const updateInfo = inventoryUpdates.get(update.id);
        result.errors.push(`Failed to update ${updateInfo?.itemName || update.id}: ${error.message}`);
        result.success = false;
        return null;
      }
      
      return update.id;
    }));
    
    updatePromises.push(updatePromise);
  }

  // Wait for all inventory updates to complete
  const updateResults = await Promise.all(updatePromises);
  
  // Step 4: Log inventory movements (non-blocking)
  console.log(`📋 Step 4: Logging ${inventoryMovements.length} inventory movements...`);
  
  // Insert movements in batches using safe UUID function
  for (let i = 0; i < inventoryMovements.length; i += BATCH_SIZE) {
    const batch = inventoryMovements.slice(i, i + BATCH_SIZE);
    
    // Process each movement using the safe function
    const movementPromises = batch.map(movement => 
      supabase.rpc('insert_inventory_movement_safe', {
        p_inventory_stock_id: movement.inventory_stock_id,
        p_movement_type: movement.movement_type,
        p_quantity_change: movement.quantity_change,
        p_previous_quantity: movement.previous_quantity,
        p_new_quantity: movement.new_quantity,
        p_reference_type: movement.reference_type,
        p_reference_id: movement.reference_id,
        p_notes: movement.notes,
        p_created_by: movement.created_by
      })
    );
    
    // Execute batch in parallel
    Promise.allSettled(movementPromises).then(results => {
      const errors = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(result => result.reason);
      
      if (errors.length > 0) {
        console.warn(`⚠️ Failed to log some inventory movements in batch ${i}-${i + batch.length}:`, errors);
      } else {
        console.log(`✅ Logged movements batch ${i}-${i + batch.length}`);
      }
    });
  }

  // Step 5: Prepare results
  console.log('📊 Step 5: Preparing results...');
  
  for (const [inventoryId, update] of inventoryUpdates) {
    if (!result.errors.some(error => error.includes(update.itemName))) {
      result.deductedItems.push({
        inventoryId,
        itemName: update.itemName,
        quantityDeducted: update.totalDeduction,
        newStock: update.newStock
      });
    }
  }

  console.log(`✅ Batch processing completed successfully`);
}

/**
 * Enhanced recipe ingredients processing with fallback mapping logic
 * Phase 2: Enhanced Fallback Logic Implementation
 */
async function processRecipeIngredientsWithFallback(
  recipe: any,
  item: BatchTransactionItem,
  transactionId: string,  
  userId: string,
  inventoryUpdates: Map<string, any>,
  inventoryMovements: Array<any>,
  result: BatchInventoryDeductionResult,
  storeId: string
): Promise<boolean> {
  console.log(`🧪 ENHANCED PROCESSING: Recipe "${recipe.name}" with ${recipe.recipe_ingredients?.length || 0} ingredients`);
  
  if (!recipe.recipe_ingredients || recipe.recipe_ingredients.length === 0) {
    console.warn(`⚠️ No ingredients found for recipe: ${recipe.name}`);
    result.warnings.push(`No ingredients found for recipe: ${recipe.name}`);
    return false;
  }

  let processedIngredients = 0;
  const failedIngredients: string[] = [];

  for (const recipeIngredient of recipe.recipe_ingredients) {
    const ingredientName = recipeIngredient.ingredient_name;
    const quantity = recipeIngredient.quantity * item.quantity;
    
    console.log(`🔍 Processing ingredient: ${ingredientName} (${quantity} required)`);

    // PRIMARY: Use direct inventory_stock_id if available and valid
    if (recipeIngredient.inventory_stock_id && recipeIngredient.inventory_stock) {
      const inventoryStock = recipeIngredient.inventory_stock;
      
      console.log(`✅ DIRECT MAPPING: ${ingredientName} → ${inventoryStock.item} (Stock: ${inventoryStock.stock_quantity})`);
      
      if (inventoryStock.stock_quantity >= quantity) {
        addToInventoryUpdates(
          inventoryStock.id,
          inventoryStock.item,
          inventoryStock.stock_quantity,
          quantity,
          transactionId,
          ingredientName,
          userId,
          inventoryUpdates,
          inventoryMovements
        );
        processedIngredients++;
      } else {
        console.warn(`⚠️ INSUFFICIENT STOCK: ${ingredientName} needs ${quantity}, only ${inventoryStock.stock_quantity} available`);
        result.warnings.push(`Insufficient stock for ${ingredientName}: need ${quantity}, have ${inventoryStock.stock_quantity}`);
        failedIngredients.push(`${ingredientName} (insufficient stock)`);
      }
      continue;
    }

    // PHASE 2 FALLBACK: Use recipe_ingredient_mappings when inventory_stock_id is null
    console.log(`🔄 FALLBACK: inventory_stock_id is null for ${ingredientName}, checking recipe_ingredient_mappings...`);
    
    const { data: mappingData, error: mappingError } = await supabase
      .from('recipe_ingredient_mappings')
      .select(`
        inventory_stock_id,
        conversion_factor,
        inventory_stock (
          id,
          item,
          stock_quantity
        )
      `)
      .eq('recipe_id', recipe.id)
      .eq('ingredient_name', ingredientName)
      .maybeSingle();

    if (mappingError) {
      console.error(`❌ Error fetching ingredient mapping for ${ingredientName}:`, mappingError);
      result.warnings.push(`Error fetching mapping for ${ingredientName}: ${mappingError.message}`);
      failedIngredients.push(`${ingredientName} (mapping error)`);
      continue;
    }

    if (mappingData?.inventory_stock) {
      const inventoryStock = mappingData.inventory_stock;
      const adjustedQuantity = quantity * (mappingData.conversion_factor || 1);
      
      console.log(`✅ MAPPING FALLBACK: ${ingredientName} → ${inventoryStock.item} (Stock: ${inventoryStock.stock_quantity}, Adjusted qty: ${adjustedQuantity})`);
      
      if (inventoryStock.stock_quantity >= adjustedQuantity) {
        addToInventoryUpdates(
          inventoryStock.id,
          inventoryStock.item,
          inventoryStock.stock_quantity,
          adjustedQuantity,
          transactionId,
          ingredientName,
          userId,
          inventoryUpdates,
          inventoryMovements
        );
        processedIngredients++;
      } else {
        console.warn(`⚠️ INSUFFICIENT STOCK (via mapping): ${ingredientName} needs ${adjustedQuantity}, only ${inventoryStock.stock_quantity} available`);
        result.warnings.push(`Insufficient stock for ${ingredientName} (via mapping): need ${adjustedQuantity}, have ${inventoryStock.stock_quantity}`);
        failedIngredients.push(`${ingredientName} (insufficient stock via mapping)`);
      }
      continue;
    }

    // FINAL FALLBACK: Try fuzzy matching with store inventory
    console.log(`🔄 FUZZY FALLBACK: No mapping found for ${ingredientName}, trying fuzzy match...`);
    
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('inventory_stock')
      .select('id, item, stock_quantity')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (inventoryError) {
      console.error(`❌ Error fetching inventory for fuzzy match:`, inventoryError);
      failedIngredients.push(`${ingredientName} (inventory fetch error)`);
      continue;
    }

    // Try fuzzy matching logic
    const fuzzyMatch = inventoryItems?.find(inv => {
      const invItem = inv.item.toLowerCase().trim();
      const ingredient = ingredientName.toLowerCase().trim();
      
      // Exact match
      if (invItem === ingredient) return true;
      
      // Common ingredient name variations
      if ((ingredient.includes('coffee') && invItem.includes('coffee')) ||
          (ingredient.includes('bean') && invItem.includes('bean')) ||
          (ingredient === 'espresso shot' && invItem.includes('coffee')) ||
          (ingredient.includes('cup') && invItem.includes('cup')) ||
          (ingredient.includes('lid') && invItem.includes('lid'))) {
        return true;
      }
      
      // Word overlap matching (70% threshold)
      const ingredientWords = ingredient.split(' ');
      const invWords = invItem.split(' ');
      const commonWords = ingredientWords.filter(word => 
        invWords.some(invWord => invWord.includes(word) || word.includes(invWord))
      );
      
      return commonWords.length >= Math.min(ingredientWords.length, invWords.length) * 0.7;
    });

    if (fuzzyMatch && fuzzyMatch.stock_quantity >= quantity) {
      console.log(`✅ FUZZY MATCH SUCCESS: ${ingredientName} → ${fuzzyMatch.item} (Stock: ${fuzzyMatch.stock_quantity})`);
      result.warnings.push(`Used fuzzy matching for ${ingredientName} → ${fuzzyMatch.item}`);
      
      addToInventoryUpdates(
        fuzzyMatch.id,
        fuzzyMatch.item,
        fuzzyMatch.stock_quantity,
        quantity,
        transactionId,
        ingredientName,
        userId,
        inventoryUpdates,
        inventoryMovements
      );
      processedIngredients++;
    } else {
      console.error(`❌ CRITICAL FAILURE: No inventory mapping found for ${ingredientName}`);
      result.errors.push(`CRITICAL: No inventory mapping found for ${ingredientName} - cannot deduct from inventory`);
      failedIngredients.push(`${ingredientName} (no mapping found)`);
    }
  }

  const success = failedIngredients.length === 0;
  
  console.log(`📊 RECIPE PROCESSING COMPLETE: ${recipe.name}`);
  console.log(`   ✅ Processed: ${processedIngredients}/${recipe.recipe_ingredients.length}`);
  console.log(`   ❌ Failed: ${failedIngredients.length} - ${failedIngredients.join(', ')}`);
  
  if (failedIngredients.length > 0) {
    result.warnings.push(`Failed to process ${failedIngredients.length} ingredients for ${recipe.name}: ${failedIngredients.join(', ')}`);
  }

  return success;
}

/**
 * Helper function to add inventory updates in a standardized way
 */
function addToInventoryUpdates(
  inventoryId: string,
  itemName: string,
  currentStock: number,
  quantity: number,
  transactionId: string,
  ingredientName: string,
  userId: string,
  inventoryUpdates: Map<string, any>,
  inventoryMovements: Array<any>
): void {
  if (!inventoryUpdates.has(inventoryId)) {
    inventoryUpdates.set(inventoryId, {
      inventoryId,
      itemName,
      currentStock,
      totalDeduction: 0,
      newStock: currentStock,
      transactions: []
    });
  }

  const update = inventoryUpdates.get(inventoryId)!;
  update.totalDeduction += quantity;
  update.newStock = Math.max(0, update.currentStock - update.totalDeduction);
  update.transactions.push({
    transactionId,
    itemName: ingredientName,
    quantity
  });

  // Prepare inventory movement record
  inventoryMovements.push({
    inventory_stock_id: inventoryId,
    movement_type: 'sale',
    quantity_change: -quantity,
    previous_quantity: currentStock,
    new_quantity: Math.max(0, currentStock - quantity),
    reference_type: 'transaction',
    reference_id: transactionId,
    notes: `Enhanced deduction: ${ingredientName} (${itemName}) for transaction ${transactionId}`,
    created_by: userId
  });
}

/**
 * Process template ingredients with intelligent inventory mapping
 */
async function processTemplateIngredients(
  template: any,
  item: BatchTransactionItem,
  storeInventoryItems: any[],
  transactionId: string,
  userId: string,
  inventoryUpdates: Map<string, any>,
  inventoryMovements: Array<{
    inventory_stock_id: string;
    movement_type: 'sale';
    quantity_change: number;
    previous_quantity: number;
    new_quantity: number;
    reference_type: 'transaction';
    reference_id: string;
    notes: string;
    created_by: string;
  }>,
  result: BatchInventoryDeductionResult
): Promise<boolean> {
  console.log(`🔄 Processing template ${template.name} with ${template.recipe_template_ingredients?.length || 0} ingredients`);
  
  if (!template.recipe_template_ingredients || template.recipe_template_ingredients.length === 0) {
    result.warnings.push(`Template ${template.name} has no ingredients defined`);
    return false;
  }

  let processedCount = 0;

  for (const templateIngredient of template.recipe_template_ingredients) {
    const ingredientName = templateIngredient.ingredient_name;
    const quantity = templateIngredient.quantity;
    
    // Find matching inventory item using intelligent matching
    const matchedInventoryItem = findBestInventoryMatch(ingredientName, storeInventoryItems);
    
    if (!matchedInventoryItem) {
      result.warnings.push(`No inventory mapping found for template ingredient: ${ingredientName}`);
      console.log(`⚠️ No inventory match for template ingredient: ${ingredientName}`);
      continue;
    }

    console.log(`✅ Matched template ingredient "${ingredientName}" to inventory item "${matchedInventoryItem.item}"`);

    const totalDeduction = quantity * item.quantity;
    const inventoryId = matchedInventoryItem.id;
    
    if (!inventoryUpdates.has(inventoryId)) {
      inventoryUpdates.set(inventoryId, {
        inventoryId,
        itemName: matchedInventoryItem.item,
        currentStock: matchedInventoryItem.stock_quantity,
        totalDeduction: 0,
        newStock: matchedInventoryItem.stock_quantity,
        transactions: []
      });
    }

    const update = inventoryUpdates.get(inventoryId)!;
    update.totalDeduction += totalDeduction;
    update.newStock = Math.max(0, update.currentStock - update.totalDeduction);
    update.transactions.push({
      transactionId,
      itemName: item.name,
      quantity: totalDeduction
    });

    // Prepare inventory movement record
    inventoryMovements.push({
      inventory_stock_id: inventoryId,
      movement_type: 'sale',
      quantity_change: -totalDeduction,
      previous_quantity: matchedInventoryItem.stock_quantity,
      new_quantity: Math.max(0, matchedInventoryItem.stock_quantity - totalDeduction),
      reference_type: 'transaction',
      reference_id: transactionId,
      notes: `Template deduction: ${ingredientName} (${matchedInventoryItem.item}) for ${item.name}`,
      created_by: userId
    });

    processedCount++;
  }

  console.log(`🎯 Template ${template.name}: processed ${processedCount}/${template.recipe_template_ingredients.length} ingredients`);
  return processedCount > 0;
}

/**
 * Process recipe ingredients with proper deduction logic
 */
async function processRecipeIngredients(
  recipe: any,
  item: BatchTransactionItem,
  transactionId: string,
  userId: string,
  inventoryUpdates: Map<string, any>,
  inventoryMovements: Array<{
    inventory_stock_id: string;
    movement_type: 'sale';
    quantity_change: number;
    previous_quantity: number;
    new_quantity: number;
    reference_type: 'transaction';
    reference_id: string;
    notes: string;
    created_by: string;
  }>,
  result: BatchInventoryDeductionResult
): Promise<boolean> {
  console.log(`🧪 Processing recipe: ${recipe.name} with ${recipe.recipe_ingredients?.length || 0} ingredients`);
  
  if (!recipe.recipe_ingredients || recipe.recipe_ingredients.length === 0) {
    result.warnings.push(`Recipe ${recipe.name} has no ingredients defined`);
    return false;
  }

  let processedCount = 0;

  // Process each ingredient in the recipe
  for (const ingredient of recipe.recipe_ingredients) {
    if (!ingredient.inventory_stock_id || !ingredient.inventory_stock) {
      result.warnings.push(`Ingredient ${ingredient.ingredient_name} not mapped to inventory`);
      continue;
    }

    const totalDeduction = ingredient.quantity * item.quantity;
    const inventoryId = ingredient.inventory_stock_id;
    
    if (!inventoryUpdates.has(inventoryId)) {
      inventoryUpdates.set(inventoryId, {
        inventoryId,
        itemName: ingredient.ingredient_name,
        currentStock: ingredient.inventory_stock.stock_quantity,
        totalDeduction: 0,
        newStock: ingredient.inventory_stock.stock_quantity,
        transactions: []
      });
    }

    const update = inventoryUpdates.get(inventoryId)!;
    update.totalDeduction += totalDeduction;
    update.newStock = Math.max(0, update.currentStock - update.totalDeduction);
    update.transactions.push({
      transactionId,
      itemName: item.name,
      quantity: totalDeduction
    });

    // Prepare inventory movement record
    inventoryMovements.push({
      inventory_stock_id: inventoryId,
      movement_type: 'sale',
      quantity_change: -totalDeduction,
      previous_quantity: ingredient.inventory_stock.stock_quantity,
      new_quantity: Math.max(0, ingredient.inventory_stock.stock_quantity - totalDeduction),
      reference_type: 'transaction',
      reference_id: transactionId,
      notes: `Batch deduction: ${ingredient.ingredient_name} for ${item.name}`,
      created_by: userId
    });

    processedCount++;
  }

  console.log(`🎯 Recipe ${recipe.name}: processed ${processedCount}/${recipe.recipe_ingredients.length} ingredients`);
  return processedCount > 0;
}

/**
 * Intelligent ingredient name matching with fuzzy logic
 */
function findBestInventoryMatch(templateIngredientName: string, inventoryItems: any[]): any | null {
  const normalizedTemplateName = templateIngredientName.toLowerCase().trim();
  
  // 1. Exact match (case-insensitive)
  let match = inventoryItems.find(item => 
    item.item.toLowerCase().trim() === normalizedTemplateName
  );
  
  if (match) {
    console.log(`🎯 Exact match: "${templateIngredientName}" → "${match.item}"`);
    return match;
  }

  // 2. Common ingredient variations mapping
  const ingredientMappings: { [key: string]: string[] } = {
    'oreo crushed': ['crushed oreo', 'oreo crushed'],
    'crushed oreo': ['oreo crushed', 'crushed oreo'],
    'biscoff crushed': ['crushed biscoff', 'biscoff crushed'],
    'crushed biscoff': ['biscoff crushed', 'crushed biscoff'],
    'graham crushed': ['crushed grahams', 'graham crushed'],
    'crushed grahams': ['graham crushed', 'crushed grahams'],
    'chocolate sauce': ['choco sauce', 'chocolate sauce', 'dark chocolate sauce'],
    'caramel sauce': ['caramel syrup', 'caramel sauce'],
    'strawberry toppings': ['strawberry jam', 'strawberry topping'],
    'nutella topping': ['nutella', 'nutella sauce']
  };

  // Check variations
  for (const [templatePattern, inventoryVariations] of Object.entries(ingredientMappings)) {
    if (normalizedTemplateName.includes(templatePattern) || templatePattern.includes(normalizedTemplateName)) {
      for (const variation of inventoryVariations) {
        match = inventoryItems.find(item => 
          item.item.toLowerCase().trim().includes(variation)
        );
        if (match) {
          console.log(`🔄 Variation match: "${templateIngredientName}" → "${match.item}" (via ${variation})`);
          return match;
        }
      }
    }
  }

  // 3. Partial word matching (if template name contains inventory item name or vice versa)
  match = inventoryItems.find(item => {
    const normalizedInventoryName = item.item.toLowerCase().trim();
    return normalizedTemplateName.includes(normalizedInventoryName) || 
           normalizedInventoryName.includes(normalizedTemplateName);
  });

  if (match) {
    console.log(`🔍 Partial match: "${templateIngredientName}" → "${match.item}"`);
    return match;
  }

  // 4. Word-based fuzzy matching (split words and check for common words)
  const templateWords = normalizedTemplateName.split(/\s+/);
  const bestMatches = inventoryItems.map(item => {
    const inventoryWords = item.item.toLowerCase().trim().split(/\s+/);
    const commonWords = templateWords.filter(word => 
      inventoryWords.some(invWord => invWord.includes(word) || word.includes(invWord))
    );
    return {
      item,
      score: commonWords.length / Math.max(templateWords.length, inventoryWords.length)
    };
  }).filter(result => result.score > 0.5)
    .sort((a, b) => b.score - a.score);

  if (bestMatches.length > 0) {
    const bestMatch = bestMatches[0];
    console.log(`🧠 Fuzzy match: "${templateIngredientName}" → "${bestMatch.item.item}" (score: ${bestMatch.score.toFixed(2)})`);
    return bestMatch.item;
  }

  console.log(`❌ No match found for template ingredient: "${templateIngredientName}"`);
  return null;
}
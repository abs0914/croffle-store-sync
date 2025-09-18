/**
 * Smart Mix & Match Inventory Deduction Service
 * 
 * Fixes the critical issue where Mix & Match products deduct ALL ingredients
 * instead of only base ingredients + selected choices + packaging.
 */

import { supabase } from '@/integrations/supabase/client';

export interface MixMatchDeductionItem {
  inventoryId: string;
  itemName: string;
  quantityDeducted: number;
  newStock: number;
  category: 'base' | 'choice' | 'packaging';
}

export interface SmartDeductionResult {
  success: boolean;
  deductedItems: MixMatchDeductionItem[];
  skippedItems: string[];
  errors: string[];
  debugInfo: {
    productName: string;
    isMixMatch: boolean;
    selectedChoices: string[];
    baseIngredients: string[];
    choiceIngredients: string[];
    packagingIngredients: string[];
  };
}

/**
 * Smart Mix & Match deduction that only deducts selected ingredients with auth context
 */
/**
 * Authentication fallback mechanism with retry logic
 */
const getAuthenticatedUserWithFallback = async (): Promise<{ userId: string | null; error?: string }> => {
  try {
    // Primary: Try to get authenticated user
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.warn(`⚠️ AUTH FALLBACK: Primary auth failed: ${error.message}`);
      
      // Fallback: Retry once after brief delay
      await new Promise(resolve => setTimeout(resolve, 100));
      const { data: { user: retryUser }, error: retryError } = await supabase.auth.getUser();
      
      if (retryError || !retryUser) {
        console.error(`❌ AUTH FALLBACK: Retry failed: ${retryError?.message}`);
        return { userId: null, error: `Authentication failed: ${retryError?.message || 'No user context'}` };
      }
      
      console.log(`✅ AUTH FALLBACK: Retry succeeded for user ${retryUser.id}`);
      return { userId: retryUser.id };
    }
    
    if (!user) {
      console.error(`❌ AUTH FALLBACK: No user in session`);
      return { userId: null, error: 'No authenticated user found' };
    }
    
    return { userId: user.id };
  } catch (error) {
    console.error(`❌ AUTH FALLBACK: Unexpected error:`, error);
    return { userId: null, error: `Auth service error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

export const deductMixMatchInventoryWithAuth = async (
  transactionId: string,
  storeId: string,
  productId: string,
  productName: string,
  quantity: number,
  userId: string
): Promise<SmartDeductionResult> => {
  console.log(`🎯 SMART MIX & MATCH: Processing ${productName} x${quantity} with user ${userId}`);
  
  // **PHASE 1 FIX**: Authentication validation with fallback
  let validatedUserId = userId;
  if (!userId) {
    console.warn(`⚠️ SMART MIX & MATCH: No user ID provided, attempting fallback authentication`);
    const authResult = await getAuthenticatedUserWithFallback();
    if (!authResult.userId) {
      return {
        success: false,
        deductedItems: [],
        skippedItems: [],
        errors: [`Authentication failed: ${authResult.error}`],
        debugInfo: {
          productName,
          isMixMatch: false,
          selectedChoices: [],
          baseIngredients: [],
          choiceIngredients: [],
          packagingIngredients: []
        }
      };
    }
    validatedUserId = authResult.userId;
  }
  
  const result: SmartDeductionResult = {
    success: true,
    deductedItems: [],
    skippedItems: [],
    errors: [],
    debugInfo: {
      productName,
      isMixMatch: false,
      selectedChoices: [],
      baseIngredients: [],
      choiceIngredients: [],
      packagingIngredients: []
    }
  };

  try {
    // Step 1: Detect if this is a Mix & Match product
    const mixMatchInfo = parseMixMatchProduct(productName);
    result.debugInfo.isMixMatch = mixMatchInfo.isMixMatch;
    result.debugInfo.selectedChoices = mixMatchInfo.selectedChoices;

    if (!mixMatchInfo.isMixMatch) {
      console.log(`ℹ️ SMART MIX & MATCH: ${productName} is not a Mix & Match product, skipping smart deduction`);
      return result;
    }

    console.log(`🔍 SMART MIX & MATCH: Detected Mix & Match product with selections:`, mixMatchInfo.selectedChoices);

    // Step 2: Get the recipe ingredients using base product name
    console.log(`🔍 SMART MIX & MATCH: Looking for recipe using base name: "${mixMatchInfo.baseName}"`);
    
    // First try: exact match by base name
    let { data: productCatalog, error: catalogError } = await supabase
      .from('product_catalog')
      .select(`
        id,
        product_name,
        recipe_id,
        recipes!inner (
          id,
          name,
          recipe_ingredients (
            quantity,
            ingredient_group_name,
            is_optional,
            inventory_stock_id,
            inventory_stock!recipe_ingredients_inventory_stock_id_fkey (
              id,
              item,
              stock_quantity
            )
          )
        )
      `)
      .eq('product_name', mixMatchInfo.baseName)
      .eq('store_id', storeId)
      .eq('is_available', true)
      .maybeSingle();

    // Second try: partial match if exact match fails
    if (catalogError || !productCatalog?.recipes) {
      console.log(`🔍 SMART MIX & MATCH: Exact match failed for "${mixMatchInfo.baseName}", trying partial match`);
      
      const { data: partialMatches } = await supabase
        .from('product_catalog')
        .select(`
          id,
          product_name,
          recipe_id,
          recipes!inner (
            id,
            name,
            recipe_ingredients (
              quantity,
              ingredient_group_name,
              is_optional,
              inventory_stock_id,
              inventory_stock!recipe_ingredients_inventory_stock_id_fkey (
                id,
                item,
                stock_quantity
              )
            )
          )
        `)
        .ilike('product_name', `%${mixMatchInfo.baseName}%`)
        .eq('store_id', storeId)
        .eq('is_available', true);

      // Find the best match (shortest name that contains the base name)
      productCatalog = partialMatches?.find(p => p.recipes?.recipe_ingredients?.length > 0) || null;
      
      if (productCatalog) {
        console.log(`✅ SMART MIX & MATCH: Found partial match: "${productCatalog.product_name}" for base "${mixMatchInfo.baseName}"`);
      }
    }

    if (catalogError || !productCatalog?.recipes) {
      console.error(`❌ SMART MIX & MATCH: No recipe found for base product "${mixMatchInfo.baseName}"`);
      result.errors.push(`No recipe found for Mix & Match product: ${productName}`);
      result.success = false;
      return result;
    }

    const recipe = productCatalog.recipes;
    console.log(`📝 SMART MIX & MATCH: Found recipe with ${recipe.recipe_ingredients?.length || 0} ingredients`);

    // Step 3: Use ingredient groups instead of hardcoded categorization
    const categorizedIngredients = categorizeIngredients(recipe.recipe_ingredients || []);
    result.debugInfo.baseIngredients = categorizedIngredients.base.map(i => i.inventory_stock?.item || 'unknown');
    result.debugInfo.choiceIngredients = categorizedIngredients.choices.map(i => i.inventory_stock?.item || 'unknown');
    result.debugInfo.packagingIngredients = categorizedIngredients.packaging.map(i => i.inventory_stock?.item || 'unknown');

    console.log(`📊 SMART MIX & MATCH: Categorized ingredients:`, {
      base: result.debugInfo.baseIngredients,
      choices: result.debugInfo.choiceIngredients,
      packaging: result.debugInfo.packagingIngredients
    });

    // Step 4: Determine which ingredients to deduct with correct portions
    const ingredientsToDeduct = [
      ...categorizedIngredients.base.map(ingredient => ({ ...ingredient, adjustedQuantity: ingredient.quantity })), // Always deduct base
      ...categorizedIngredients.packaging.map(ingredient => ({ ...ingredient, adjustedQuantity: ingredient.quantity })), // Always deduct packaging
      // Only deduct selected choices with adjusted portions based on product type
      ...categorizedIngredients.choices
        .filter(ingredient => {
          const inventoryItem = ingredient.inventory_stock?.item || '';
          const isMatched = mixMatchInfo.selectedChoices.some(choice => 
            matchesChoice(inventoryItem, choice)
          );
          console.log(`🔍 CHOICE MATCHING: "${inventoryItem}" vs selections [${mixMatchInfo.selectedChoices.join(', ')}] → ${isMatched}`);
          return isMatched;
        })
        .map(ingredient => ({
          ...ingredient,
          adjustedQuantity: getAdjustedQuantityForMixMatch(ingredient, mixMatchInfo.productType)
        }))
    ];

    console.log(`🎯 SMART MIX & MATCH: Will deduct ${ingredientsToDeduct.length} ingredients (${categorizedIngredients.base.length} base + ${categorizedIngredients.packaging.length} packaging + ${ingredientsToDeduct.length - categorizedIngredients.base.length - categorizedIngredients.packaging.length} selected choices)`);

    // Step 5: Process deductions with authenticated user ID
    for (const ingredient of ingredientsToDeduct) {
      if (!ingredient.inventory_stock_id || !ingredient.inventory_stock) {
        result.skippedItems.push(`${ingredient.ingredient_name} (no inventory mapping)`);
        continue;
      }

      const ingredientName = ingredient.inventory_stock?.item || 'unknown';
      const totalDeduction = ingredient.adjustedQuantity * quantity;
      const currentStock = ingredient.inventory_stock?.stock_quantity || 0;
      const newStock = Math.max(0, currentStock - totalDeduction);

      console.log(`🔢 SMART MIX & MATCH: Deducting ${totalDeduction} of ${ingredientName} (original: ${ingredient.quantity}, adjusted: ${ingredient.adjustedQuantity}) (${currentStock} → ${newStock})`);

      // Determine category using ingredient groups FIRST
      let category: 'base' | 'choice' | 'packaging' = 'choice';
      const groupName = ingredient.ingredient_group_name || 'base';
      
      if (groupName === 'packaging') {
        category = 'packaging';
      } else if (groupName === 'base') {
        category = 'base';
      } else if (categorizedIngredients.base.some(b => b.inventory_stock?.item === ingredientName)) {
        category = 'base';
      } else if (categorizedIngredients.packaging.some(p => p.inventory_stock?.item === ingredientName)) {
        category = 'packaging';
      }

      // Update inventory stock
      const { error: updateError } = await supabase
        .from('inventory_stock')
        .update({ 
          stock_quantity: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', ingredient.inventory_stock_id);

      if (updateError) {
        result.errors.push(`Failed to update ${ingredientName}: ${updateError.message}`);
        result.success = false;
        continue;
      }

      // **EMERGENCY FIX**: Enhanced audit trail with correct foreign key reference
      console.log(`🚨 AUDIT: About to create audit records for ${ingredientName}...`);
      
      // First, log to inventory_transactions (primary audit table) - use inventory_stock_id for FK constraint
      let auditSuccess = false;
      const validInventoryStockId = ingredient.inventory_stock_id;
      
      if (validInventoryStockId) {
        try {
          const { error: transactionLogError } = await supabase
            .from('inventory_transactions')
            .insert({
              store_id: storeId,
              product_id: validInventoryStockId, // **FIX**: Use inventory_stock.id for FK constraint
              transaction_type: 'sale',
              quantity: totalDeduction,
              previous_quantity: currentStock,
              new_quantity: newStock,
              reference_id: transactionId,
              notes: `Smart Mix & Match deduction: ${ingredientName} for ${productName} (${category})`,
              created_by: validatedUserId // Use validated user ID
            });
          
          if (transactionLogError) {
            const errorMsg = `Audit logging failed for ${ingredientName}: ${transactionLogError.message}`;
            console.error(`❌ AUDIT FAILED: ${errorMsg}`);
            
            // **EMERGENCY FIX**: Proper error propagation but continue processing
            result.errors.push(errorMsg);
            
            // Enhanced FK diagnostics
            if (transactionLogError.message?.includes('foreign key constraint')) {
              const fkError = `FK constraint violation: inventory_transactions expects inventory_stock.id but got ${validInventoryStockId}`;
              console.error(`❌ FK VIOLATION: ${fkError}`);
              result.errors.push(fkError);
            }
          } else {
            auditSuccess = true;
            console.log(`✅ AUDIT LOGGED: ${ingredientName} transaction logged successfully`);
          }
        } catch (auditError) {
          const errorMsg = `Audit exception for ${ingredientName}: ${auditError instanceof Error ? auditError.message : 'Unknown error'}`;
          console.error(`❌ AUDIT ERROR: ${errorMsg}`);
          result.errors.push(errorMsg); // **EMERGENCY FIX**: Don't swallow exceptions
        }
      } else {
        const warningMsg = `No valid inventory_stock_id for audit logging: ${ingredientName}`;
        console.warn(`⚠️ AUDIT SKIPPED: ${warningMsg}`);
        result.skippedItems.push(warningMsg);
      }
      
      // Second, log to inventory_movements (legacy compatibility) - with improved error handling
      try {
        const { error: rpcError } = await supabase.rpc('insert_inventory_movement_safe', {
          p_inventory_stock_id: ingredient.inventory_stock_id,
          p_movement_type: 'sale',
          p_quantity_change: -totalDeduction,
          p_previous_quantity: currentStock,
          p_new_quantity: newStock,
          p_reference_type: 'transaction',
          p_reference_id: transactionId,
          p_notes: `Smart Mix & Match deduction: ${ingredientName} for ${productName} (${category})`,
          p_created_by: validatedUserId
        });
        
        if (rpcError) {
          const errorMsg = `Legacy audit RPC failed for ${ingredientName}: ${rpcError.message}`;
          console.error(`❌ LEGACY AUDIT FAILED: ${errorMsg}`);
          result.errors.push(errorMsg); // **PHASE 1 FIX**: Proper error propagation
        } else {
          console.log(`✅ LEGACY AUDIT LOGGED: ${ingredientName} movement logged successfully`);
        }
      } catch (rpcError) {
        const errorMsg = `RPC exception for ${ingredientName}: ${rpcError instanceof Error ? rpcError.message : 'Unknown error'}`;
        console.error(`❌ RPC ERROR: ${errorMsg}`);
        result.errors.push(errorMsg); // **PHASE 1 FIX**: Don't swallow RPC exceptions
      }
      
      // **PHASE 1 FIX**: Enhanced audit status reporting
      if (auditSuccess) {
        console.log(`✅ AUDIT STATUS: Complete audit trail created for ${ingredientName}`);
      } else {
        const auditWarning = `Incomplete audit trail for ${ingredientName} - manual review required`;
        console.warn(`⚠️ AUDIT STATUS: ${auditWarning}`);
        // Note: We don't add this to errors since it's not a fatal error, but it's logged for monitoring
      }

      result.deductedItems.push({
        inventoryId: ingredient.inventory_stock_id,
        itemName: ingredientName,
        quantityDeducted: totalDeduction,
        newStock,
        category
      });
    }

    // Step 6: Track skipped choice ingredients
    const skippedChoices = categorizedIngredients.choices.filter(ingredient =>
      !mixMatchInfo.selectedChoices.some(choice => 
        matchesChoice(ingredient.inventory_stock?.item || '', choice)
      )
    );

    for (const skipped of skippedChoices) {
      result.skippedItems.push(`${skipped.inventory_stock?.item || 'unknown'} (not selected)`);
    }

    console.log(`✅ SMART MIX & MATCH: Completed deduction for ${productName}. Deducted ${result.deductedItems.length}, skipped ${result.skippedItems.length}, errors ${result.errors.length}`);

    if (result.errors.length > 0) {
      result.success = false;
    }

    return result;

  } catch (error) {
    console.error('❌ SMART MIX & MATCH: Deduction failed:', error);
    result.success = false;
    result.errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
};

/**
 * Legacy Smart Mix & Match deduction - maintained for backward compatibility
 */
export const deductMixMatchInventory = async (
  transactionId: string,
  storeId: string,
  productId: string,
  productName: string,
  quantity: number
): Promise<SmartDeductionResult> => {
  console.log(`🎯 SMART MIX & MATCH: Processing ${productName} x${quantity}`);
  
  const result: SmartDeductionResult = {
    success: true,
    deductedItems: [],
    skippedItems: [],
    errors: [],
    debugInfo: {
      productName,
      isMixMatch: false,
      selectedChoices: [],
      baseIngredients: [],
      choiceIngredients: [],
      packagingIngredients: []
    }
  };

  try {
    // Step 1: Detect if this is a Mix & Match product
    const mixMatchInfo = parseMixMatchProduct(productName);
    result.debugInfo.isMixMatch = mixMatchInfo.isMixMatch;
    result.debugInfo.selectedChoices = mixMatchInfo.selectedChoices;

    if (!mixMatchInfo.isMixMatch) {
      console.log(`ℹ️ SMART MIX & MATCH: ${productName} is not a Mix & Match product, skipping smart deduction`);
      return result;
    }

    console.log(`🔍 SMART MIX & MATCH: Detected Mix & Match product with selections:`, mixMatchInfo.selectedChoices);

    // Step 2: Get the recipe ingredients using base product name
    console.log(`🔍 SMART MIX & MATCH: Looking for recipe using base name: "${mixMatchInfo.baseName}"`);
    
    // First try: exact match by base name
    let { data: productCatalog, error: catalogError } = await supabase
      .from('product_catalog')
      .select(`
        id,
        product_name,
        recipe_id,
        recipes!inner (
          id,
          name,
          recipe_ingredients (
            quantity,
            ingredient_group_name,
            is_optional,
            inventory_stock_id,
            inventory_stock!recipe_ingredients_inventory_stock_id_fkey (
              id,
              item,
              stock_quantity
            )
          )
        )
      `)
      .eq('product_name', mixMatchInfo.baseName)
      .eq('store_id', storeId)
      .eq('is_available', true)
      .maybeSingle();

    // Second try: partial match if exact match fails
    if (catalogError || !productCatalog?.recipes) {
      console.log(`🔍 SMART MIX & MATCH: Exact match failed for "${mixMatchInfo.baseName}", trying partial match`);
      
      const { data: partialMatches } = await supabase
        .from('product_catalog')
        .select(`
          id,
          product_name,
          recipe_id,
          recipes!inner (
            id,
            name,
            recipe_ingredients (
              quantity,
              ingredient_group_name,
              is_optional,
              inventory_stock_id,
              inventory_stock!recipe_ingredients_inventory_stock_id_fkey (
                id,
                item,
                stock_quantity
              )
            )
          )
        `)
        .ilike('product_name', `%${mixMatchInfo.baseName}%`)
        .eq('store_id', storeId)
        .eq('is_available', true);

      // Find the best match (shortest name that contains the base name)
      productCatalog = partialMatches?.find(p => p.recipes?.recipe_ingredients?.length > 0) || null;
      
      if (productCatalog) {
        console.log(`✅ SMART MIX & MATCH: Found partial match: "${productCatalog.product_name}" for base "${mixMatchInfo.baseName}"`);
      }
    }

    if (catalogError || !productCatalog?.recipes) {
      console.error(`❌ SMART MIX & MATCH: No recipe found for base product "${mixMatchInfo.baseName}"`);
      result.errors.push(`No recipe found for Mix & Match product: ${productName}`);
      result.success = false;
      return result;
    }

    const recipe = productCatalog.recipes;
    console.log(`📝 SMART MIX & MATCH: Found recipe with ${recipe.recipe_ingredients?.length || 0} ingredients`);

    // Step 3: Use ingredient groups instead of hardcoded categorization
    const categorizedIngredients = categorizeIngredients(recipe.recipe_ingredients || []);
    result.debugInfo.baseIngredients = categorizedIngredients.base.map(i => i.inventory_stock?.item || 'unknown');
    result.debugInfo.choiceIngredients = categorizedIngredients.choices.map(i => i.inventory_stock?.item || 'unknown');
    result.debugInfo.packagingIngredients = categorizedIngredients.packaging.map(i => i.inventory_stock?.item || 'unknown');

    console.log(`📊 SMART MIX & MATCH: Categorized ingredients:`, {
      base: result.debugInfo.baseIngredients,
      choices: result.debugInfo.choiceIngredients,
      packaging: result.debugInfo.packagingIngredients
    });

    // Step 4: Determine which ingredients to deduct with correct portions
    const ingredientsToDeduct = [
      ...categorizedIngredients.base.map(ingredient => ({ ...ingredient, adjustedQuantity: ingredient.quantity })), // Always deduct base
      ...categorizedIngredients.packaging.map(ingredient => ({ ...ingredient, adjustedQuantity: ingredient.quantity })), // Always deduct packaging
      // Only deduct selected choices with adjusted portions based on product type
      ...categorizedIngredients.choices
        .filter(ingredient => {
          const inventoryItem = ingredient.inventory_stock?.item || '';
          console.log(`🔍 CHOICE MATCHING DEBUG: Testing ingredient "${inventoryItem}"`);
          console.log(`🔍 Available selections: [${mixMatchInfo.selectedChoices.join(', ')}]`);
          
          const isMatched = mixMatchInfo.selectedChoices.some(choice => {
            console.log(`🔍 Testing choice "${choice}" against ingredient "${inventoryItem}"`);
            const matches = matchesChoice(inventoryItem, choice);
            console.log(`🔍 Result for "${choice}" vs "${inventoryItem}": ${matches ? '✅ MATCH' : '❌ NO MATCH'}`);
            return matches;
          });
          
          console.log(`🔍 FINAL CHOICE MATCHING: "${inventoryItem}" vs selections [${mixMatchInfo.selectedChoices.join(', ')}] → ${isMatched ? '✅ SELECTED' : '❌ SKIPPED'}`);
          
          // SPECIAL DEBUG for Chocolate Sauce
          if (inventoryItem.toLowerCase().includes('chocolate sauce')) {
            console.log(`🚨 CHOCOLATE SAUCE DEBUG: Found Chocolate Sauce ingredient!`);
            console.log(`🚨 - Inventory Item: "${inventoryItem}"`);
            console.log(`🚨 - Selected Choices: [${mixMatchInfo.selectedChoices.join(', ')}]`);
            console.log(`🚨 - Is Matched: ${isMatched}`);
            console.log(`🚨 - Ingredient Group: ${ingredient.ingredient_group_name || 'N/A'}`);
            console.log(`🚨 - Is Optional: ${ingredient.is_optional || false}`);
          }
          
          return isMatched;
        })
        .map(ingredient => ({
          ...ingredient,
          adjustedQuantity: getAdjustedQuantityForMixMatch(ingredient, mixMatchInfo.productType)
        }))
    ];

    console.log(`🎯 SMART MIX & MATCH: Will deduct ${ingredientsToDeduct.length} ingredients (${categorizedIngredients.base.length} base + ${categorizedIngredients.packaging.length} packaging + ${ingredientsToDeduct.length - categorizedIngredients.base.length - categorizedIngredients.packaging.length} selected choices)`);

  // Step 5: Process deductions
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  
  console.log(`🔐 SMART MIX & MATCH: Auth context - userId: ${userId || 'NULL'}`);
  
  if (!userId) {
    console.error('❌ SMART MIX & MATCH: No authenticated user found - movement logging will fail');
    result.errors.push('Authentication context missing - movements cannot be logged');
  }

    for (const ingredient of ingredientsToDeduct) {
      if (!ingredient.inventory_stock_id || !ingredient.inventory_stock) {
        result.skippedItems.push(`${ingredient.ingredient_name} (no inventory mapping)`);
        continue;
      }

      const ingredientName = ingredient.inventory_stock?.item || 'unknown';
      const totalDeduction = ingredient.adjustedQuantity * quantity;
      const currentStock = ingredient.inventory_stock?.stock_quantity || 0;
      const newStock = Math.max(0, currentStock - totalDeduction);

      console.log(`🔢 SMART MIX & MATCH: Deducting ${totalDeduction} of ${ingredientName} (original: ${ingredient.quantity}, adjusted: ${ingredient.adjustedQuantity}) (${currentStock} → ${newStock})`);

      // Update inventory stock
      const { error: updateError } = await supabase
        .from('inventory_stock')
        .update({ 
          stock_quantity: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', ingredient.inventory_stock_id);

      if (updateError) {
        result.errors.push(`Failed to update ${ingredientName}: ${updateError.message}`);
        result.success = false;
        continue;
      }

      // Log inventory movement
      try {
        await supabase.rpc('insert_inventory_movement_safe', {
          p_inventory_stock_id: ingredient.inventory_stock_id,
          p_movement_type: 'sale',
          p_quantity_change: -totalDeduction,
          p_previous_quantity: currentStock,
          p_new_quantity: newStock,
          p_reference_type: 'transaction',
          p_reference_id: transactionId,
          p_notes: `Smart Mix & Match deduction: ${ingredientName} for ${productName}`,
          p_created_by: userId || null
        });
      } catch (logError) {
        console.warn(`⚠️ SMART MIX & MATCH: Failed to log movement for ${ingredientName}:`, logError);
      }

      // Determine category using ingredient groups
      let category: 'base' | 'choice' | 'packaging' = 'choice';
      const groupName = ingredient.ingredient_group_name || 'base';
      
      if (groupName === 'packaging') {
        category = 'packaging';
      } else if (groupName === 'base') {
        category = 'base';
      } else if (categorizedIngredients.base.some(b => b.inventory_stock?.item === ingredientName)) {
        category = 'base';
      } else if (categorizedIngredients.packaging.some(p => p.inventory_stock?.item === ingredientName)) {
        category = 'packaging';
      }

      result.deductedItems.push({
        inventoryId: ingredient.inventory_stock_id,
        itemName: ingredientName,
        quantityDeducted: totalDeduction,
        newStock,
        category
      });
    }

    // Step 6: Track skipped choice ingredients
    const skippedChoices = categorizedIngredients.choices.filter(ingredient =>
      !mixMatchInfo.selectedChoices.some(choice => 
        matchesChoice(ingredient.inventory_stock?.item || '', choice)
      )
    );

    for (const skipped of skippedChoices) {
      result.skippedItems.push(`${skipped.inventory_stock?.item || 'unknown'} (not selected)`);
    }

    console.log(`✅ SMART MIX & MATCH: Completed deduction for ${productName}. Deducted ${result.deductedItems.length}, skipped ${result.skippedItems.length}, errors ${result.errors.length}`);

    if (result.errors.length > 0) {
      result.success = false;
    }

    return result;

  } catch (error) {
    console.error('❌ SMART MIX & MATCH: Deduction failed:', error);
    result.success = false;
    result.errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
};

/**
 * Parse Mix & Match product name to identify selected choices, product type, and base name
 */
function parseMixMatchProduct(productName: string): {
  isMixMatch: boolean;
  selectedChoices: string[];
  productType: 'croffle_overload' | 'mini_croffle' | 'regular';
  baseName: string;
} {
  const name = productName.toLowerCase().trim();
  
  // Determine product type and extract base name
  let productType: 'croffle_overload' | 'mini_croffle' | 'regular' = 'regular';
  let isMixMatch = false;
  let baseName = productName; // Default to original name
  
  if (name.includes('croffle overload')) {
    productType = 'croffle_overload';
    isMixMatch = true;
    // Extract base name: "Croffle Overload with Choco Flakes" → "Croffle Overload"
    baseName = productName.replace(/\s+(with|and)\s+.*/i, '').trim();
  } else if (name.includes('mini croffle')) {
    productType = 'mini_croffle';
    isMixMatch = true;
    // Extract base name: "Mini Croffle with Choco Flakes and Tiramisu" → "Mini Croffle"
    baseName = productName.replace(/\s+(with|and)\s+.*/i, '').trim();
  }
  
  if (!isMixMatch) {
    return { isMixMatch: false, selectedChoices: [], productType: 'regular', baseName: productName };
  }

  // Parse selected choices from the product name
  const selectedChoices: string[] = [];
  
  // Extract customization part after "with" or "and"
  const customizationMatch = productName.match(/\s+(with|and)\s+(.+)$/i);
  const customizationText = customizationMatch ? customizationMatch[2] : '';
  
  // Common Mix & Match choices and their variations
  // IMPORTANT: Order matters - more specific patterns should come FIRST to avoid conflicts
  const choicePatterns = [
    { choice: 'Chocolate Sauce', patterns: ['chocolate sauce', 'chocolate syrup', 'choco sauce', 'chocolate'] }, // Added generic 'chocolate' back for POS compatibility
    { choice: 'Caramel Sauce', patterns: ['caramel sauce', 'caramel syrup', 'caramel'] },
    { choice: 'Choco Flakes', patterns: ['choco flakes', 'chocolate flakes', 'choco flake'] },
    { choice: 'Whipped Cream', patterns: ['whipped cream', 'whip cream', 'cream'] },
    { choice: 'Colored Sprinkles', patterns: ['colored sprinkles', 'sprinkles'] },
    { choice: 'Peanut', patterns: ['peanut', 'peanuts'] },
    { choice: 'Marshmallow', patterns: ['marshmallow', 'marshmallows'] },
    { choice: 'Tiramisu', patterns: ['tiramisu'] },
    { choice: 'Blueberry', patterns: ['blueberry', 'blueberries'] }
  ];

  console.log(`🔍 PARSING DEBUG: Starting pattern matching for "${customizationText}"`);
  
  for (const { choice, patterns } of choicePatterns) {
    console.log(`🔍 PARSING DEBUG: Testing choice "${choice}" with patterns [${patterns.join(', ')}]`);
    
    const matchingPattern = patterns.find(pattern => {
      const matches = customizationText.toLowerCase().includes(pattern);
      console.log(`  - Pattern "${pattern}": ${matches ? '✅ MATCH' : '❌ NO MATCH'}`);
      return matches;
    });
    
    if (matchingPattern) {
      selectedChoices.push(choice);
      console.log(`🎯 CHOICE DETECTED: "${matchingPattern}" → "${choice}"`);
    }
  }

  console.log(`🔍 SMART MIX & MATCH: Parsed "${productName}" → base: "${baseName}", type: ${productType}, selections: [${selectedChoices.join(', ')}]`);
  console.log(`🔍 CUSTOMIZATION TEXT: "${customizationText}"`);
  
  return { isMixMatch: true, selectedChoices, productType, baseName };
}

/**
 * Categorize recipe ingredients using the new ingredient_group_name and is_optional fields
 */
function categorizeIngredientsByGroup(ingredients: any[]): {
  base: any[];
  choices: any[];
  packaging: any[];
} {
  const base: any[] = [];
  const choices: any[] = [];
  const packaging: any[] = [];

  for (const ingredient of ingredients) {
    const groupName = ingredient.ingredient_group_name || 'base';
    const isOptional = ingredient.is_optional || false;
    
    if (groupName === 'packaging') {
      packaging.push(ingredient);
    } else if (groupName === 'base') {
      base.push(ingredient);
    } else if (isOptional || ['sauce', 'topping', 'addon'].includes(groupName)) {
      choices.push(ingredient);
    } else {
      // Default to base for unknown groups
      base.push(ingredient);
    }
  }

  return { base, choices, packaging };
}

/**
 * Legacy categorize ingredients function - kept for backward compatibility
 * but now using the new ingredient groups when available
 */
function categorizeIngredients(ingredients: any[]): {
  base: any[];
  choices: any[];
  packaging: any[];
} {
  // If ingredients have group information, use the new method
  if (ingredients.length > 0 && ingredients[0].ingredient_group_name !== undefined) {
    return categorizeIngredientsByGroup(ingredients);
  }
  
  // Fallback to legacy hardcoded categorization
  const base: any[] = [];
  const choices: any[] = [];
  const packaging: any[] = [];

  for (const ingredient of ingredients) {
    const name = ingredient.inventory_stock?.item?.toLowerCase() || '';
    
    // Packaging items
    if (name.includes('cup') || name.includes('wrapper') || name.includes('paper') || 
        name.includes('packaging') || name.includes('container') || name.includes('bag') || 
        name.includes('box') || name.includes('lid') || name.includes('wax') || 
        name.includes('chopstick') || name.includes('spoon') || name.includes('fork') ||
        name.includes('popsicle')) {
      packaging.push(ingredient);
    }
    // Base ingredients (croissant, etc.)
    else if (name.includes('croissant') || name.includes('biscuit') || 
             name.includes('base') || name.includes('dough')) {
      base.push(ingredient);
    }
    // Choice ingredients (toppings, sauces)
    else if (name.includes('peanut') || name.includes('marshmallow') || 
             name.includes('choco flakes') || name.includes('caramel') || 
             name.includes('chocolate sauce') || name.includes('whipped cream') ||
             name.includes('tiramisu') || name.includes('blueberry') ||
             name.includes('sauce') || name.includes('syrup') || name.includes('cream')) {
      choices.push(ingredient);
    }
    // Default to base if unclear
    else {
      base.push(ingredient);
    }
  }

  return { base, choices, packaging };
}
/**
 * Check if an ingredient name matches a selected choice
 * **ENHANCED**: Comprehensive matching for all Mini Croffle sauces and toppings
 */
function matchesChoice(ingredientName: string, selectedChoice: string): boolean {
  const ingredient = ingredientName.toLowerCase();
  const choice = selectedChoice.toLowerCase();
  
  console.log(`🎯 MATCHING: "${ingredient}" <-> "${choice}"`);
  
  // Direct match
  if (ingredient.includes(choice)) {
    console.log(`✅ MATCHING: Direct match found`);
    return true;
  }
  
  // Reverse match (choice contains ingredient)
  if (choice.includes(ingredient)) {
    console.log(`✅ MATCHING: Choice contains ingredient`);
    return true;
  }
  
  // **ENHANCED**: Comprehensive variations for all Mini Croffle ingredients
  const variations: Record<string, string[]> = {
    // Chocolate variations (most common)
    'chocolate sauce': ['chocolate sauce', 'chocolate syrup', 'choco sauce', 'dark chocolate sauce'],
    'chocolate': ['chocolate', 'choco', 'chocolate sauce', 'dark chocolate', 'chocolate syrup', 'chocolate crumble'],
    'choco flakes': ['choco flakes', 'chocolate flakes', 'choco flake'],
    
    // Other sauces
    'caramel sauce': ['caramel sauce', 'caramel syrup', 'caramel'],
    'strawberry sauce': ['strawberry sauce', 'strawberry syrup', 'strawberry'],
    'tiramisu': ['tiramisu', 'tiramisu sauce'],
    'vanilla sauce': ['vanilla sauce', 'vanilla syrup', 'vanilla'],
    'nutella': ['nutella', 'nutella sauce'],
    
    // Toppings
    'colored sprinkles': ['colored sprinkles', 'sprinkles', 'sprinkle', 'rainbow sprinkles'],
    'sprinkles': ['colored sprinkles', 'sprinkles', 'sprinkle', 'rainbow sprinkles'],
    'marshmallow': ['marshmallows', 'marshmallow', 'marshmallow sauce'],
    'oreo': ['oreo', 'oreo crumbs', 'crushed oreo'],
    'graham': ['graham', 'graham cracker', 'crushed graham'],
    'nuts': ['crushed nuts', 'almonds', 'peanuts', 'peanut'],
    'peanut': ['peanuts', 'peanut', 'crushed nuts'],
    
    // Base ingredients
    'whipped cream': ['whipped cream', 'whip cream', 'cream'],
    'croissant': ['croissant', 'regular croissant'],
    'popsicle stick': ['popsicle stick', 'stick'],
    
    // Beverages (for combo expansion)
    'americano': ['americano', 'iced americano', 'hot americano'],
    'latte': ['latte', 'cafe latte', 'iced latte', 'hot latte'],
    'cappuccino': ['cappuccino', 'iced cappuccino', 'hot cappuccino']
  };
  
  // Enhanced variation matching with bidirectional checks
  for (const [key, patterns] of Object.entries(variations)) {
    console.log(`🔍 MATCHING DEBUG: Testing variation "${key}" for choice "${choice}"`);
    
    // Check if choice matches the key or any pattern
    const choiceMatchesKey = choice.includes(key) || patterns.some(pattern => choice.includes(pattern));
    
    if (choiceMatchesKey) {
      console.log(`  - Choice matches variation "${key}": ✅`);
      
      // Check if ingredient matches the key or any pattern
      const ingredientMatchesVariation = ingredient.includes(key) || patterns.some(pattern => ingredient.includes(pattern));
      
      if (ingredientMatchesVariation) {
        console.log(`✅ MATCHING: Variation match found - ${key}`);
        return true;
      }
    }
    
    // Also check reverse: if ingredient matches key, check if choice matches patterns
    const ingredientMatchesKey = ingredient.includes(key) || patterns.some(pattern => ingredient.includes(pattern));
    
    if (ingredientMatchesKey) {
      console.log(`  - Ingredient matches variation "${key}": ✅`);
      
      const choiceMatchesVariation = choice.includes(key) || patterns.some(pattern => choice.includes(pattern));
      
      if (choiceMatchesVariation) {
        console.log(`✅ MATCHING: Reverse variation match found - ${key}`);
        return true;
      }
    }
  }
  
  console.log(`❌ MATCHING: No match found`);
  return false;
}

/**
 * Get adjusted quantity for Mix & Match products based on business rules:
 * - Croffle Overload: Toppings should be deducted as 1.0 portion (not 4.0)
 * - Mini Croffle: Sauces and toppings should be deducted as 0.5 portion (not 1.5)
 */
function getAdjustedQuantityForMixMatch(
  ingredient: any, 
  productType: 'croffle_overload' | 'mini_croffle' | 'regular'
): number {
  const originalQuantity = ingredient.quantity;
  const ingredientName = ingredient.inventory_stock?.item?.toLowerCase() || '';

  console.log(`🔍 QUANTITY ADJUSTMENT DEBUG: Ingredient "${ingredient.inventory_stock?.item}", Product Type: ${productType}, Original: ${originalQuantity}`);

  // Only adjust for Mix & Match choice ingredients
  if (productType === 'croffle_overload') {
    // Croffle Overload: Toppings should be 1.0 portion only (not 4.0)
    const isTopCheck = isTopping(ingredientName);
    console.log(`🔍 CROFFLE OVERLOAD CHECK: Is "${ingredientName}" a topping? ${isTopCheck}`);
    if (isTopCheck) {
      console.log(`🎯 CROFFLE OVERLOAD ADJUSTMENT: ${ingredient.inventory_stock?.item} ${originalQuantity} → 1.0`);
      return 1.0;
    }
  } else if (productType === 'mini_croffle') {
    // Mini Croffle: Sauces and toppings should be 0.5 portion (not 1.5)
    const isSauceCheck = isSauce(ingredientName);
    const isTopCheck = isTopping(ingredientName);
    console.log(`🔍 MINI CROFFLE CHECK: Is "${ingredientName}" a sauce? ${isSauceCheck}, Is topping? ${isTopCheck}`);
    
    if (isSauceCheck || isTopCheck) {
      console.log(`🎯 MINI CROFFLE ADJUSTMENT: ${ingredient.inventory_stock?.item} ${originalQuantity} → 0.5`);
      return 0.5;
    }
  }

  console.log(`🔍 NO ADJUSTMENT: ${ingredient.inventory_stock?.item} keeps original quantity ${originalQuantity}`);
  // No adjustment for base ingredients or regular products
  return originalQuantity;
}

/**
 * Check if ingredient is a topping
 */
function isTopping(ingredientName: string): boolean {
  const toppingKeywords = [
    'peanut', 'marshmallow', 'choco flakes', 'chocolate flakes', 'choco flake',
    'colored sprinkles', 'sprinkles', 'crushed oreo', 'oreo crushed', 'crushed grahams',
    'graham cracker', 'graham', 'blueberry', 'strawberry', 'banana'
  ];
  
  console.log(`🔍 TOPPING CHECK: Testing "${ingredientName}" against keywords: [${toppingKeywords.join(', ')}]`);
  
  const isMatch = toppingKeywords.some(keyword => {
    const matches = ingredientName.includes(keyword);
    console.log(`  - "${keyword}": ${matches ? '✅' : '❌'}`);
    return matches;
  });
  
  console.log(`🔍 TOPPING RESULT: "${ingredientName}" is ${isMatch ? 'a topping ✅' : 'not a topping ❌'}`);
  return isMatch;
}

/**
 * Check if ingredient is a sauce
 */
function isSauce(ingredientName: string): boolean {
  const sauceKeywords = [
    'caramel sauce', 'chocolate sauce', 'tiramisu', 'strawberry sauce',
    'nutella', 'vanilla sauce', 'matcha sauce', 'sauce', 'syrup', 'chocolate'
  ];
  
  console.log(`🔍 SAUCE CHECK: Testing "${ingredientName}" against keywords: [${sauceKeywords.join(', ')}]`);
  
  const isMatch = sauceKeywords.some(keyword => {
    const matches = ingredientName.includes(keyword);
    console.log(`  - "${keyword}": ${matches ? '✅' : '❌'}`);
    return matches;
  });
  
  console.log(`🔍 SAUCE RESULT: "${ingredientName}" is ${isMatch ? 'a sauce ✅' : 'not a sauce ❌'}`);
  return isMatch;
}
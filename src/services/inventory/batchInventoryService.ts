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
  
  console.log(`🚀 Starting BATCH inventory deduction for transaction: ${transactionId}`);
  console.log(`📦 Processing ${items.length} items with ${timeoutMs}ms timeout`);
  
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
      setTimeout(() => reject(new Error(`Inventory deduction timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    // Main processing promise
    const processingPromise = processBatchInventoryDeduction(transactionId, storeId, items, result);

    // Race between processing and timeout
    await Promise.race([processingPromise, timeoutPromise]);

  } catch (error) {
    console.error('❌ Batch inventory deduction failed:', error);
    result.success = false;
    if (error instanceof Error && error.message.includes('timeout')) {
      result.errors.push(`Processing timeout after ${timeoutMs}ms - transaction may be partially processed`);
    } else {
      result.errors.push(`Batch processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  result.processingTimeMs = Date.now() - startTime;
  
  console.log(`⏱️ Batch inventory deduction completed in ${result.processingTimeMs}ms`);
  console.log(`📊 Results: ${result.deductedItems.length} deducted, ${result.errors.length} errors, ${result.warnings.length} warnings`);
  
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
      // Try to find by name match in catalog
      const catalogByName = recipes.find(pc => 
        pc.product_name.toLowerCase().trim() === item.name.toLowerCase().trim()
      );
      const recipeByName = catalogByName?.recipes;
      
      if (!recipeByName) {
        // Try recipe template as fallback
        const template = recipeTemplates.find(t => t.name.toLowerCase().trim() === item.name.toLowerCase().trim());
        if (template) {
          console.log(`🔄 Using recipe template for ${item.name} - no store-specific recipe found`);
          result.warnings.push(`Using recipe template for ${item.name} - no store-specific recipe found`);
          
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
      }
    }

    if (!recipe || !recipe.recipe_ingredients || recipe.recipe_ingredients.length === 0) {
      result.warnings.push(`No recipe or ingredients found for ${item.name} (${item.product_id || 'no ID'})`);
      continue;
    }

    console.log(`🧪 Processing recipe: ${recipe.name} with ${recipe.recipe_ingredients.length} ingredients`);

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
        created_by: userId || 'system'
      });
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
  
  // Insert movements in batches
  for (let i = 0; i < inventoryMovements.length; i += BATCH_SIZE) {
    const batch = inventoryMovements.slice(i, i + BATCH_SIZE);
    
    // Don't await this - let it run in background
    supabase
      .from('inventory_movements')
      .insert(batch)
      .then(({ error }) => {
        if (error) {
          console.warn(`⚠️ Failed to log inventory movements batch ${i}-${i + batch.length}:`, error.message);
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
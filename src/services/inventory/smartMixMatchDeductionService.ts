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
 * Smart Mix & Match deduction that only deducts selected ingredients
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

    // Step 2: Get the recipe ingredients with group information
    const { data: productCatalog, error: catalogError } = await supabase
      .from('product_catalog')
      .select(`
        id,
        product_name,
        recipe_id,
        recipes!inner (
          id,
          name,
          recipe_ingredients (
            ingredient_name,
            quantity,
            ingredient_group_name,
            is_optional,
            inventory_stock_id,
            inventory_stock (
              id,
              item,
              stock_quantity
            )
          )
        )
      `)
      .eq('id', productId)
      .eq('store_id', storeId)
      .eq('is_available', true)
      .maybeSingle();

    if (catalogError || !productCatalog?.recipes) {
      result.errors.push(`No recipe found for Mix & Match product: ${productName}`);
      result.success = false;
      return result;
    }

    const recipe = productCatalog.recipes;
    console.log(`📝 SMART MIX & MATCH: Found recipe with ${recipe.recipe_ingredients?.length || 0} ingredients`);

    // Step 3: Use ingredient groups instead of hardcoded categorization
    const categorizedIngredients = categorizeIngredients(recipe.recipe_ingredients || []);
    result.debugInfo.baseIngredients = categorizedIngredients.base.map(i => i.ingredient_name);
    result.debugInfo.choiceIngredients = categorizedIngredients.choices.map(i => i.ingredient_name);
    result.debugInfo.packagingIngredients = categorizedIngredients.packaging.map(i => i.ingredient_name);

    console.log(`📊 SMART MIX & MATCH: Categorized ingredients:`, {
      base: result.debugInfo.baseIngredients,
      choices: result.debugInfo.choiceIngredients,
      packaging: result.debugInfo.packagingIngredients
    });

    // Step 4: Determine which ingredients to deduct
    const ingredientsToDeduct = [
      ...categorizedIngredients.base, // Always deduct base
      ...categorizedIngredients.packaging, // Always deduct packaging
      // Only deduct selected choices
      ...categorizedIngredients.choices.filter(ingredient => 
        mixMatchInfo.selectedChoices.some(choice => 
          matchesChoice(ingredient.ingredient_name, choice)
        )
      )
    ];

    console.log(`🎯 SMART MIX & MATCH: Will deduct ${ingredientsToDeduct.length} ingredients (${categorizedIngredients.base.length} base + ${categorizedIngredients.packaging.length} packaging + ${ingredientsToDeduct.length - categorizedIngredients.base.length - categorizedIngredients.packaging.length} selected choices)`);

    // Step 5: Process deductions
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    for (const ingredient of ingredientsToDeduct) {
      if (!ingredient.inventory_stock_id || !ingredient.inventory_stock) {
        result.skippedItems.push(`${ingredient.ingredient_name} (no inventory mapping)`);
        continue;
      }

      const totalDeduction = ingredient.quantity * quantity;
      const currentStock = ingredient.inventory_stock.stock_quantity;
      const newStock = Math.max(0, currentStock - totalDeduction);

      console.log(`🔢 SMART MIX & MATCH: Deducting ${totalDeduction} of ${ingredient.ingredient_name} (${currentStock} → ${newStock})`);

      // Update inventory stock
      const { error: updateError } = await supabase
        .from('inventory_stock')
        .update({ 
          stock_quantity: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', ingredient.inventory_stock_id);

      if (updateError) {
        result.errors.push(`Failed to update ${ingredient.ingredient_name}: ${updateError.message}`);
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
          p_notes: `Smart Mix & Match deduction: ${ingredient.ingredient_name} for ${productName}`,
          p_created_by: userId || null
        });
      } catch (logError) {
        console.warn(`⚠️ SMART MIX & MATCH: Failed to log movement for ${ingredient.ingredient_name}:`, logError);
      }

      // Determine category using ingredient groups
      let category: 'base' | 'choice' | 'packaging' = 'choice';
      const groupName = ingredient.ingredient_group_name || 'base';
      
      if (groupName === 'packaging') {
        category = 'packaging';
      } else if (groupName === 'base') {
        category = 'base';
      } else if (categorizedIngredients.base.some(b => b.ingredient_name === ingredient.ingredient_name)) {
        category = 'base';
      } else if (categorizedIngredients.packaging.some(p => p.ingredient_name === ingredient.ingredient_name)) {
        category = 'packaging';
      }

      result.deductedItems.push({
        inventoryId: ingredient.inventory_stock_id,
        itemName: ingredient.ingredient_name,
        quantityDeducted: totalDeduction,
        newStock,
        category
      });
    }

    // Step 6: Track skipped choice ingredients
    const skippedChoices = categorizedIngredients.choices.filter(ingredient =>
      !mixMatchInfo.selectedChoices.some(choice => 
        matchesChoice(ingredient.ingredient_name, choice)
      )
    );

    for (const skipped of skippedChoices) {
      result.skippedItems.push(`${skipped.ingredient_name} (not selected)`);
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
 * Parse Mix & Match product name to identify selected choices
 */
function parseMixMatchProduct(productName: string): {
  isMixMatch: boolean;
  selectedChoices: string[];
} {
  const name = productName.toLowerCase().trim();
  
  // Check if this is a Mix & Match product
  const isMixMatch = name.includes('croffle overload') || name.includes('mini croffle');
  
  if (!isMixMatch) {
    return { isMixMatch: false, selectedChoices: [] };
  }

  // Parse selected choices from the product name
  const selectedChoices: string[] = [];
  
  // Common Mix & Match choices and their variations
  const choicePatterns = [
    { choice: 'Peanut', patterns: ['peanut', 'peanuts'] },
    { choice: 'Marshmallow', patterns: ['marshmallow', 'marshmallows'] },
    { choice: 'Choco Flakes', patterns: ['choco flakes', 'chocolate flakes', 'choco flake'] },
    { choice: 'Caramel Sauce', patterns: ['caramel sauce', 'caramel', 'caramel syrup'] },
    { choice: 'Chocolate Sauce', patterns: ['chocolate sauce', 'chocolate syrup', 'choco sauce'] },
    { choice: 'Whipped Cream', patterns: ['whipped cream', 'whip cream', 'cream'] },
    { choice: 'Tiramisu', patterns: ['tiramisu'] },
    { choice: 'Blueberry', patterns: ['blueberry', 'blueberries'] }
  ];

  for (const { choice, patterns } of choicePatterns) {
    if (patterns.some(pattern => name.includes(pattern))) {
      selectedChoices.push(choice);
    }
  }

  console.log(`🔍 SMART MIX & MATCH: Parsed "${productName}" → selections: [${selectedChoices.join(', ')}]`);
  
  return { isMixMatch: true, selectedChoices };
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
    const name = ingredient.ingredient_name.toLowerCase();
    
    // Packaging items
    if (name.includes('cup') || name.includes('wrapper') || name.includes('paper') || 
        name.includes('packaging') || name.includes('container') || name.includes('bag') || 
        name.includes('box') || name.includes('lid') || name.includes('wax') || 
        name.includes('chopstick') || name.includes('spoon') || name.includes('fork')) {
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
 */
function matchesChoice(ingredientName: string, selectedChoice: string): boolean {
  const ingredient = ingredientName.toLowerCase();
  const choice = selectedChoice.toLowerCase();
  
  // Direct match
  if (ingredient.includes(choice)) {
    return true;
  }
  
  // Handle variations
  const variations: Record<string, string[]> = {
    'peanut': ['peanuts', 'peanut'],
    'marshmallow': ['marshmallows', 'marshmallow'],
    'choco flakes': ['choco flakes', 'chocolate flakes', 'choco flake'],
    'caramel sauce': ['caramel sauce', 'caramel', 'caramel syrup'],
    'chocolate sauce': ['chocolate sauce', 'chocolate syrup', 'choco sauce'],
    'whipped cream': ['whipped cream', 'whip cream', 'cream'],
    'tiramisu': ['tiramisu'],
    'blueberry': ['blueberry', 'blueberries']
  };
  
  for (const [key, patterns] of Object.entries(variations)) {
    if (choice.includes(key) && patterns.some(pattern => ingredient.includes(pattern))) {
      return true;
    }
  }
  
  return false;
}
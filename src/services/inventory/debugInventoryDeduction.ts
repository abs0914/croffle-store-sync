/**
 * Debug Inventory Deduction Service
 * 
 * This service provides comprehensive logging and debugging for inventory deduction
 * to help identify why the system is not working properly.
 */

import { supabase } from '@/integrations/supabase/client';

export interface DebugTransactionItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface DebugResult {
  success: boolean;
  transactionId: string;
  storeId: string;
  itemsProcessed: number;
  recipesFound: number;
  ingredientsIdentified: number;
  inventoryUpdates: number;
  movementRecords: number;
  errors: string[];
  warnings: string[];
  debugLog: string[];
}

/**
 * Debug version of inventory deduction with comprehensive logging
 */
export async function debugInventoryDeduction(
  transactionId: string,
  storeId: string,
  transactionItems: DebugTransactionItem[]
): Promise<DebugResult> {
  const result: DebugResult = {
    success: true,
    transactionId,
    storeId,
    itemsProcessed: 0,
    recipesFound: 0,
    ingredientsIdentified: 0,
    inventoryUpdates: 0,
    movementRecords: 0,
    errors: [],
    warnings: [],
    debugLog: []
  };

  result.debugLog.push(`🔄 Starting debug inventory deduction for transaction: ${transactionId}`);
  result.debugLog.push(`📍 Store ID: ${storeId}`);
  result.debugLog.push(`📦 Items to process: ${transactionItems.length}`);

  try {
    for (const item of transactionItems) {
      result.debugLog.push(`\n🔍 Processing item: ${item.name} (quantity: ${item.quantity})`);
      result.itemsProcessed++;

      // Step 1: Get recipe template
      result.debugLog.push(`   📋 Looking up recipe template for: ${item.name}`);
      
      const { data: recipe, error: recipeError } = await supabase
        .from('recipe_templates')
        .select('id, name')
        .eq('name', item.name)
        .eq('is_active', true)
        .single();

      if (recipeError || !recipe) {
        const errorMsg = `Recipe not found for product: ${item.name}`;
        result.warnings.push(errorMsg);
        result.debugLog.push(`   ❌ ${errorMsg} (Error: ${recipeError?.message || 'Not found'})`);
        continue;
      }

      result.debugLog.push(`   ✅ Recipe found: ${recipe.name} (ID: ${recipe.id})`);
      result.recipesFound++;

      // Step 2: Get recipe ingredients
      result.debugLog.push(`   🧪 Getting ingredients for recipe: ${recipe.id}`);
      
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('recipe_template_ingredients')
        .select('*')
        .eq('recipe_template_id', recipe.id);

      if (ingredientsError || !ingredients) {
        const errorMsg = `Failed to get ingredients for ${item.name}: ${ingredientsError?.message}`;
        result.errors.push(errorMsg);
        result.debugLog.push(`   ❌ ${errorMsg}`);
        continue;
      }

      result.debugLog.push(`   ✅ Found ${ingredients.length} ingredients`);
      result.ingredientsIdentified += ingredients.length;

      // Step 3: Process each ingredient
      for (const ingredient of ingredients) {
        const requiredQuantity = ingredient.quantity * item.quantity;
        
        result.debugLog.push(`\n      🔍 Processing ingredient: ${ingredient.ingredient_name}`);
        result.debugLog.push(`         Required: ${requiredQuantity} ${ingredient.unit} (${ingredient.quantity} × ${item.quantity})`);

        // Step 3a: Get current inventory
        result.debugLog.push(`         📦 Looking up inventory for: ${ingredient.ingredient_name}`);
        
        const { data: inventory, error: inventoryError } = await supabase
          .from('inventory_stock')
          .select('*')
          .eq('store_id', storeId)
          .eq('item', ingredient.ingredient_name)
          .eq('is_active', true)
          .single();

        if (inventoryError || !inventory) {
          const errorMsg = `Inventory not found for ${ingredient.ingredient_name} at store ${storeId}`;
          result.errors.push(errorMsg);
          result.debugLog.push(`         ❌ ${errorMsg} (Error: ${inventoryError?.message || 'Not found'})`);
          continue;
        }

        const previousStock = inventory.stock_quantity;
        const newStock = Math.max(0, previousStock - requiredQuantity);

        result.debugLog.push(`         ✅ Current inventory: ${previousStock} ${inventory.unit}`);
        result.debugLog.push(`         📊 Calculated new stock: ${newStock} (${previousStock} - ${requiredQuantity})`);

        // Check if we have enough stock
        if (previousStock < requiredQuantity) {
          const warningMsg = `Insufficient stock for ${ingredient.ingredient_name}: required ${requiredQuantity}, available ${previousStock}`;
          result.warnings.push(warningMsg);
          result.debugLog.push(`         ⚠️  ${warningMsg}`);
        }

        // Step 3b: Update inventory
        result.debugLog.push(`         🔄 Updating inventory from ${previousStock} to ${newStock}`);
        
        const { error: updateError } = await supabase
          .from('inventory_stock')
          .update({ 
            stock_quantity: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', inventory.id);

        if (updateError) {
          const errorMsg = `Failed to update inventory for ${ingredient.ingredient_name}: ${updateError.message}`;
          result.errors.push(errorMsg);
          result.debugLog.push(`         ❌ ${errorMsg}`);
          continue;
        }

        result.debugLog.push(`         ✅ Inventory updated successfully`);
        result.inventoryUpdates++;

        // Step 3c: Create inventory movement record
        result.debugLog.push(`         📝 Creating inventory movement record`);
        
        const { error: movementError } = await supabase
          .from('inventory_transactions')
          .insert({
            store_id: storeId,
            product_id: inventory.id, // Use inventory ID as product reference
            transaction_type: 'sale',
            quantity: -requiredQuantity,
            previous_quantity: previousStock,
            new_quantity: newStock,
            reference_id: transactionId,
            notes: `Debug deduction for transaction ${transactionId}`,
            created_by: '00000000-0000-0000-0000-000000000000', // System user
            created_at: new Date().toISOString()
          });

        if (movementError) {
          const warningMsg = `Movement record failed for ${ingredient.ingredient_name}: ${movementError.message}`;
          result.warnings.push(warningMsg);
          result.debugLog.push(`         ⚠️  ${warningMsg}`);
        } else {
          result.debugLog.push(`         ✅ Movement record created successfully`);
          result.movementRecords++;
        }
      }
    }

    // Set overall success based on whether we had any critical errors
    result.success = result.errors.length === 0;

    result.debugLog.push(`\n🎯 DEDUCTION SUMMARY:`);
    result.debugLog.push(`   Items processed: ${result.itemsProcessed}`);
    result.debugLog.push(`   Recipes found: ${result.recipesFound}`);
    result.debugLog.push(`   Ingredients identified: ${result.ingredientsIdentified}`);
    result.debugLog.push(`   Inventory updates: ${result.inventoryUpdates}`);
    result.debugLog.push(`   Movement records: ${result.movementRecords}`);
    result.debugLog.push(`   Errors: ${result.errors.length}`);
    result.debugLog.push(`   Warnings: ${result.warnings.length}`);
    result.debugLog.push(`   Overall success: ${result.success}`);

  } catch (error) {
    result.success = false;
    const errorMsg = `Debug inventory deduction failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push(errorMsg);
    result.debugLog.push(`❌ CRITICAL ERROR: ${errorMsg}`);
  }

  return result;
}

/**
 * Test the debug inventory deduction with a specific transaction
 */
export async function testDebugDeduction(transactionId: string) {
  console.log('🧪 TESTING DEBUG INVENTORY DEDUCTION');
  console.log('='.repeat(50));
  
  try {
    // Get transaction details
    const { data: transaction, error: txnError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (txnError || !transaction) {
      console.log('❌ Transaction not found');
      return;
    }

    console.log(`✅ Transaction found: ${transaction.receipt_number}`);

    // Get transaction items
    const { data: items, error: itemsError } = await supabase
      .from('transaction_items')
      .select('*')
      .eq('transaction_id', transactionId);

    if (itemsError || !items) {
      console.log('❌ Transaction items not found');
      return;
    }

    console.log(`✅ Found ${items.length} transaction items`);

    // Convert to debug format
    const debugItems: DebugTransactionItem[] = items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price
    }));

    // Run debug deduction
    const result = await debugInventoryDeduction(
      transactionId,
      transaction.store_id,
      debugItems
    );

    // Display results
    console.log('\n📊 DEBUG RESULTS:');
    console.log(`Success: ${result.success}`);
    console.log(`Items processed: ${result.itemsProcessed}`);
    console.log(`Recipes found: ${result.recipesFound}`);
    console.log(`Ingredients identified: ${result.ingredientsIdentified}`);
    console.log(`Inventory updates: ${result.inventoryUpdates}`);
    console.log(`Movement records: ${result.movementRecords}`);
    console.log(`Errors: ${result.errors.length}`);
    console.log(`Warnings: ${result.warnings.length}`);

    if (result.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      result.errors.forEach(error => console.log(`   - ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      result.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    console.log('\n📝 DETAILED LOG:');
    result.debugLog.forEach(log => console.log(log));

    return result;

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

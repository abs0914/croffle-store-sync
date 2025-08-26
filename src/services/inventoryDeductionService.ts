/**
 * Inventory Deduction Service
 * 
 * This service handles automatic inventory deduction when transactions are completed.
 * It ensures that inventory levels are properly maintained and tracked.
 */

import { supabase } from '@/lib/supabase';

export interface TransactionItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface InventoryDeductionResult {
  success: boolean;
  deductedItems: Array<{
    ingredient: string;
    deducted: number;
    unit: string;
    previousStock: number;
    newStock: number;
  }>;
  errors: string[];
  warnings: string[];
}

/**
 * Deducts inventory for a completed transaction
 */
export async function deductInventoryForTransaction(
  transactionId: string,
  storeId: string,
  transactionItems: TransactionItem[]
): Promise<InventoryDeductionResult> {
  const result: InventoryDeductionResult = {
    success: true,
    deductedItems: [],
    errors: [],
    warnings: []
  };

  console.log(`🔄 Deducting inventory for transaction: ${transactionId}`);

  try {
    for (const item of transactionItems) {
      console.log(`Processing item: ${item.name} (quantity: ${item.quantity})`);

      // Get recipe template for this product
      const { data: recipe, error: recipeError } = await supabase
        .from('recipe_templates')
        .select('id, name')
        .eq('name', item.name)
        .eq('is_active', true)
        .single();

      if (recipeError || !recipe) {
        result.warnings.push(`Recipe not found for product: ${item.name}`);
        continue;
      }

      // Get recipe ingredients
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('recipe_template_ingredients')
        .select('*')
        .eq('recipe_template_id', recipe.id);

      if (ingredientsError || !ingredients) {
        result.errors.push(`Failed to get ingredients for ${item.name}: ${ingredientsError?.message}`);
        continue;
      }

      // Process each ingredient
      for (const ingredient of ingredients) {
        const requiredQuantity = ingredient.quantity * item.quantity;
        
        console.log(`  Processing ingredient: ${ingredient.ingredient_name} (required: ${requiredQuantity} ${ingredient.unit})`);

        // Get current inventory
        const { data: inventory, error: inventoryError } = await supabase
          .from('inventory_stock')
          .select('*')
          .eq('store_id', storeId)
          .eq('item', ingredient.ingredient_name)
          .eq('is_active', true)
          .single();

        if (inventoryError || !inventory) {
          result.errors.push(`Inventory not found for ${ingredient.ingredient_name} at store ${storeId}`);
          continue;
        }

        const previousStock = inventory.stock_quantity;
        const newStock = Math.max(0, previousStock - requiredQuantity);

        // Check if we have enough stock
        if (previousStock < requiredQuantity) {
          result.warnings.push(
            `Insufficient stock for ${ingredient.ingredient_name}: required ${requiredQuantity}, available ${previousStock}`
          );
        }

        // Update inventory
        const { error: updateError } = await supabase
          .from('inventory_stock')
          .update({ 
            stock_quantity: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', inventory.id);

        if (updateError) {
          result.errors.push(`Failed to update inventory for ${ingredient.ingredient_name}: ${updateError.message}`);
          continue;
        }

        // Record the deduction
        result.deductedItems.push({
          ingredient: ingredient.ingredient_name,
          deducted: requiredQuantity,
          unit: ingredient.unit,
          previousStock,
          newStock
        });

        console.log(`    ✅ Updated ${ingredient.ingredient_name}: ${previousStock} → ${newStock}`);

        // Create inventory movement record (if table exists)
        try {
          const { error: movementError } = await supabase
            .from('inventory_transactions')
            .insert({
              store_id: storeId,
              item: ingredient.ingredient_name, // Use 'item' instead of 'item_name'
              transaction_type: 'sale',
              quantity: -requiredQuantity,
              previous_quantity: previousStock,
              new_quantity: newStock,
              reference_id: transactionId,
              notes: `Automatic deduction for transaction ${transactionId}`,
              created_at: new Date().toISOString()
            });

          if (movementError) {
            result.warnings.push(`Movement record failed for ${ingredient.ingredient_name}: ${movementError.message}`);
          }
        } catch (movementError) {
          result.warnings.push(`Movement record failed for ${ingredient.ingredient_name}: ${movementError}`);
        }
      }
    }

    // Set overall success based on whether we had any critical errors
    result.success = result.errors.length === 0;

    console.log(`✅ Inventory deduction completed. Success: ${result.success}, Deducted: ${result.deductedItems.length} items`);

  } catch (error) {
    result.success = false;
    result.errors.push(`Inventory deduction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('❌ Inventory deduction error:', error);
  }

  return result;
}

/**
 * Validates that sufficient inventory exists for a transaction before processing
 */
export async function validateInventoryForTransaction(
  storeId: string,
  transactionItems: TransactionItem[]
): Promise<{
  valid: boolean;
  insufficientItems: Array<{
    ingredient: string;
    required: number;
    available: number;
    unit: string;
  }>;
}> {
  const insufficientItems: Array<{
    ingredient: string;
    required: number;
    available: number;
    unit: string;
  }> = [];

  try {
    for (const item of transactionItems) {
      // Get recipe template
      const { data: recipe } = await supabase
        .from('recipe_templates')
        .select('id')
        .eq('name', item.name)
        .eq('is_active', true)
        .single();

      if (!recipe) continue;

      // Get recipe ingredients
      const { data: ingredients } = await supabase
        .from('recipe_template_ingredients')
        .select('*')
        .eq('recipe_template_id', recipe.id);

      if (!ingredients) continue;

      // Check each ingredient
      for (const ingredient of ingredients) {
        const requiredQuantity = ingredient.quantity * item.quantity;

        const { data: inventory } = await supabase
          .from('inventory_stock')
          .select('stock_quantity')
          .eq('store_id', storeId)
          .eq('item', ingredient.ingredient_name)
          .eq('is_active', true)
          .single();

        if (!inventory || inventory.stock_quantity < requiredQuantity) {
          insufficientItems.push({
            ingredient: ingredient.ingredient_name,
            required: requiredQuantity,
            available: inventory?.stock_quantity || 0,
            unit: ingredient.unit
          });
        }
      }
    }
  } catch (error) {
    console.error('Inventory validation error:', error);
  }

  return {
    valid: insufficientItems.length === 0,
    insufficientItems
  };
}

/**
 * Rolls back inventory deduction for a transaction (in case of cancellation)
 */
export async function rollbackInventoryDeduction(
  transactionId: string,
  storeId: string,
  transactionItems: TransactionItem[]
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    console.log(`🔄 Rolling back inventory for transaction: ${transactionId}`);

    for (const item of transactionItems) {
      const { data: recipe } = await supabase
        .from('recipe_templates')
        .select('id')
        .eq('name', item.name)
        .eq('is_active', true)
        .single();

      if (!recipe) continue;

      const { data: ingredients } = await supabase
        .from('recipe_template_ingredients')
        .select('*')
        .eq('recipe_template_id', recipe.id);

      if (!ingredients) continue;

      for (const ingredient of ingredients) {
        const returnQuantity = ingredient.quantity * item.quantity;

        const { data: inventory } = await supabase
          .from('inventory_stock')
          .select('*')
          .eq('store_id', storeId)
          .eq('item', ingredient.ingredient_name)
          .eq('is_active', true)
          .single();

        if (inventory) {
          const newStock = inventory.stock_quantity + returnQuantity;

          const { error: updateError } = await supabase
            .from('inventory_stock')
            .update({ 
              stock_quantity: newStock,
              updated_at: new Date().toISOString()
            })
            .eq('id', inventory.id);

          if (updateError) {
            errors.push(`Failed to rollback ${ingredient.ingredient_name}: ${updateError.message}`);
          } else {
            console.log(`    ✅ Rolled back ${ingredient.ingredient_name}: ${inventory.stock_quantity} → ${newStock}`);
          }
        }
      }
    }
  } catch (error) {
    errors.push(`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Gets inventory status for a store
 */
export async function getInventoryStatus(storeId: string) {
  const { data: inventory, error } = await supabase
    .from('inventory_stock')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('item');

  if (error) {
    throw new Error(`Failed to get inventory status: ${error.message}`);
  }

  const lowStockItems = inventory?.filter(item => 
    item.stock_quantity <= (item.minimum_threshold || 5)
  ) || [];

  return {
    totalItems: inventory?.length || 0,
    lowStockItems: lowStockItems.length,
    lowStockDetails: lowStockItems,
    inventory: inventory || []
  };
}

/**
 * Simple Emergency Transaction Recovery Service
 * Focuses only on recipe-based inventory recovery
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FailedTransaction {
  id: string;
  receipt_number: string;
  store_id: string;
  total: number;
  created_at: string;
  items: Array<{
    product_id?: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

interface RecoveryResult {
  success: boolean;
  recoveredCount: number;
  failedCount: number;
  errors: string[];
}

/**
 * Find all transactions from Sep 11th onwards with zero inventory movements
 */
export const findFailedTransactions = async (storeId: string): Promise<FailedTransaction[]> => {
  console.log('🔍 Finding failed transactions since Sep 11th...');
  
  try {
    // Get all transactions from Sep 11th onwards
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        receipt_number,
        store_id,
        total,
        created_at,
        items
      `)
      .eq('store_id', storeId)
      .gte('created_at', '2024-09-11T00:00:00Z')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching transactions:', error);
      return [];
    }

    if (!transactions?.length) {
      console.log('ℹ️ No transactions found since Sep 11th');
      return [];
    }

    console.log(`📊 Found ${transactions.length} transactions since Sep 11th`);

    // Check which ones have zero inventory movements
    const failedTransactions: FailedTransaction[] = [];

    for (const transaction of transactions) {
      const { data: movements, error: movementError } = await supabase
        .from('inventory_movements')
        .select('id')
        .eq('reference_id', transaction.id)
        .eq('reference_type', 'transaction')
        .limit(1);

      if (movementError) {
        console.error(`❌ Error checking movements for ${transaction.id}:`, movementError);
        continue;
      }

      // If no inventory movements found, this transaction failed
      if (!movements || movements.length === 0) {
        failedTransactions.push({
          id: transaction.id,
          receipt_number: transaction.receipt_number,
          store_id: transaction.store_id,
          total: transaction.total,
          created_at: transaction.created_at,
          items: typeof transaction.items === 'string' 
            ? JSON.parse(transaction.items) 
            : (transaction.items as any[])
        });
      }
    }

    console.log(`🚨 Found ${failedTransactions.length} transactions with missing inventory deductions`);
    return failedTransactions;

  } catch (error) {
    console.error('❌ Error in findFailedTransactions:', error);
    return [];
  }
};

/**
 * Recover inventory deductions for failed transactions
 */
export const recoverFailedTransactions = async (
  failedTransactions: FailedTransaction[]
): Promise<RecoveryResult> => {
  console.log(`🚑 Starting recovery for ${failedTransactions.length} failed transactions...`);
  
  let recoveredCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const transaction of failedTransactions) {
    try {
      console.log(`🔧 Recovering transaction: ${transaction.receipt_number}`);
      
      const recoveryResult = await recoverSingleTransaction(transaction);
      
      if (recoveryResult.success) {
        recoveredCount++;
        console.log(`✅ Successfully recovered: ${transaction.receipt_number}`);
      } else {
        failedCount++;
        errors.push(`Failed to recover ${transaction.receipt_number}: ${recoveryResult.errors.join(', ')}`);
        console.error(`❌ Failed to recover: ${transaction.receipt_number}`);
      }
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      failedCount++;
      const errorMsg = `Recovery error for ${transaction.receipt_number}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error('❌', errorMsg);
    }
  }

  const result = {
    success: recoveredCount > 0,
    recoveredCount,
    failedCount,
    errors
  };

  console.log(`🏁 Recovery completed: ${recoveredCount} recovered, ${failedCount} failed`);
  
  if (result.success) {
    toast.success(`✅ Recovered ${recoveredCount} transactions successfully!`);
  } else {
    toast.error(`❌ Recovery failed. ${failedCount} transactions could not be recovered.`);
  }

  return result;
};

/**
 * Recover a single transaction's inventory deductions (recipe-based only)
 */
const recoverSingleTransaction = async (
  transaction: FailedTransaction
): Promise<{ success: boolean; errors: string[] }> => {
  const errors: string[] = [];

  for (const item of transaction.items) {
    try {
      // Skip items without product IDs
      if (!item.product_id) {
        console.log(`⚠️ Skipping item without product ID: ${item.name}`);
        continue;
      }

      // FIXED: Check if this is a recipe-based product through product catalog
      const { data: productCatalog } = await supabase
        .from('product_catalog')
        .select(`
          recipe_id,
          recipes!inner (
            id,
            recipe_ingredients_with_names (
              ingredient_name,
              quantity,
              unit
            )
          )
        `)
        .eq('id', item.product_id)
        .eq('store_id', transaction.store_id)
        .eq('is_available', true)
        .eq('recipes.is_active', true)
        .not('recipe_id', 'is', null)
        .maybeSingle();

      const recipeData = productCatalog?.recipes;

      if (recipeData?.recipe_ingredients_with_names) {
        // Process recipe ingredients
        for (const ingredient of recipeData.recipe_ingredients_with_names) {
          const result = await deductIngredientInventory(
            transaction.store_id,
            ingredient.ingredient_name,
            ingredient.quantity * item.quantity,
            item.name,
            item.quantity
          );
          
          if (!result.success) {
            errors.push(result.error || `Failed to deduct ${ingredient.ingredient_name}`);
          }
        }
      } else {
        // Skip non-recipe products
        console.log(`ℹ️ Skipping non-recipe product: ${item.name}`);
      }
    } catch (error) {
      errors.push(`Error processing ${item.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { success: errors.length === 0, errors };
};

/**
 * Deduct ingredient inventory (simplified - no movement records)
 */
const deductIngredientInventory = async (
  storeId: string,
  ingredientName: string,
  deductionAmount: number,
  productName: string,
  productQuantity: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Find inventory stock
    const { data: inventoryStock } = await supabase
      .from('inventory_stock')
      .select('id, stock_quantity')
      .eq('store_id', storeId)
      .eq('item', ingredientName)
      .eq('is_active', true)
      .maybeSingle();

    if (!inventoryStock) {
      return { success: false, error: `Ingredient not found: ${ingredientName}` };
    }

    const newQuantity = Math.max(0, inventoryStock.stock_quantity - deductionAmount);

    // Update inventory
    const { error: updateError } = await supabase
      .from('inventory_stock')
      .update({ stock_quantity: newQuantity })
      .eq('id', inventoryStock.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    console.log(`✅ Recovered deduction: ${deductionAmount} of ${ingredientName}`);
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
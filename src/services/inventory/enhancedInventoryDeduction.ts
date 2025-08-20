import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { findInventoryMatch, IngredientMatch } from './inventoryMatcher';

export interface DeductionResult {
  success: boolean;
  deductedItems: Array<{
    ingredient_name: string;
    inventory_item_name: string;
    quantity_deducted: number;
    inventory_item_id: string;
  }>;
  failedItems: Array<{
    ingredient_name: string;
    reason: string;
    required_quantity: number;
    available_quantity: number;
  }>;
  warnings: string[];
}

/**
 * Enhanced inventory deduction with proper matching and validation
 */
export const deductInventoryForTransaction = async (
  transactionId: string,
  storeId: string,
  cartItems: Array<{
    product_name: string;
    quantity: number;
    recipe_template_id?: string;
  }>
): Promise<DeductionResult> => {
  console.log('🔄 Starting enhanced inventory deduction for transaction:', transactionId);
  
  const result: DeductionResult = {
    success: true,
    deductedItems: [],
    failedItems: [],
    warnings: []
  };

  try {
    for (const cartItem of cartItems) {
      if (!cartItem.recipe_template_id) {
        result.warnings.push(`No recipe template found for ${cartItem.product_name}`);
        continue;
      }

      // Get recipe template ingredients
      const { data: recipeIngredients, error: recipeError } = await supabase
        .from('recipe_template_ingredients')
        .select('ingredient_name, unit, quantity')
        .eq('recipe_template_id', cartItem.recipe_template_id);

      if (recipeError || !recipeIngredients) {
        result.warnings.push(`Failed to fetch ingredients for ${cartItem.product_name}`);
        continue;
      }

      console.log(`📋 Processing ${recipeIngredients.length} ingredients for ${cartItem.product_name}`);

      // Process each ingredient
      for (const ingredient of recipeIngredients) {
        const requiredQuantity = ingredient.quantity * cartItem.quantity;
        
        console.log(`🔍 Finding match for ingredient: ${ingredient.ingredient_name} (${requiredQuantity} ${ingredient.unit})`);
        
        // Find matching inventory item
        const match = await findInventoryMatch(
          ingredient.ingredient_name,
          ingredient.unit,
          storeId
        );

        if (match.match_type === 'none') {
          result.failedItems.push({
            ingredient_name: ingredient.ingredient_name,
            reason: 'No matching inventory item found',
            required_quantity: requiredQuantity,
            available_quantity: 0
          });
          result.success = false;
          console.error(`❌ No match found for ${ingredient.ingredient_name}`);
          continue;
        }

        console.log(`✅ Match found: ${ingredient.ingredient_name} -> ${match.inventory_item_name} (${match.match_type}, confidence: ${match.confidence})`);

        // Apply unit conversion if needed
        const finalQuantity = requiredQuantity * match.conversion_factor;
        
        console.log(`🔢 Quantity calculation: ${requiredQuantity} * ${match.conversion_factor} = ${finalQuantity}`);

        // Check availability
        const { data: stockData, error: stockError } = await supabase
          .from('inventory_stock')
          .select('stock_quantity, serving_ready_quantity, item')
          .eq('id', match.inventory_item_id)
          .single();

        if (stockError || !stockData) {
          result.failedItems.push({
            ingredient_name: ingredient.ingredient_name,
            reason: 'Failed to check inventory availability',
            required_quantity: finalQuantity,
            available_quantity: 0
          });
          result.success = false;
          continue;
        }

        const availableQuantity = stockData.serving_ready_quantity || stockData.stock_quantity || 0;
        
        if (availableQuantity < finalQuantity) {
          result.failedItems.push({
            ingredient_name: ingredient.ingredient_name,
            reason: `Insufficient stock (available: ${availableQuantity}, required: ${finalQuantity})`,
            required_quantity: finalQuantity,
            available_quantity: availableQuantity
          });
          result.success = false;
          console.error(`❌ Insufficient stock for ${ingredient.ingredient_name}: need ${finalQuantity}, have ${availableQuantity}`);
          continue;
        }

        // Perform deduction
        const newQuantity = Math.max(0, availableQuantity - finalQuantity);
        
        const { error: updateError } = await supabase
          .from('inventory_stock')
          .update({
            serving_ready_quantity: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', match.inventory_item_id);

        if (updateError) {
          result.failedItems.push({
            ingredient_name: ingredient.ingredient_name,
            reason: `Failed to update inventory: ${updateError.message}`,
            required_quantity: finalQuantity,
            available_quantity: availableQuantity
          });
          result.success = false;
          console.error(`❌ Failed to update inventory for ${ingredient.ingredient_name}:`, updateError);
          continue;
        }

        // Log inventory movement
        await supabase
          .from('inventory_movements')
          .insert({
            inventory_stock_id: match.inventory_item_id,
            movement_type: 'deduction',
            quantity_change: -finalQuantity,
            previous_quantity: availableQuantity,
            new_quantity: newQuantity,
            notes: `Transaction ${transactionId} - ${cartItem.product_name} (${match.match_type} match: ${ingredient.ingredient_name} -> ${match.inventory_item_name})`,
            created_by: 'system' // TODO: Get actual user ID
          });

        // Log inventory transaction (removed - not needed for this service)
        // Transaction logging is handled by inventory_movements above

        result.deductedItems.push({
          ingredient_name: ingredient.ingredient_name,
          inventory_item_name: match.inventory_item_name,
          quantity_deducted: finalQuantity,
          inventory_item_id: match.inventory_item_id
        });

        console.log(`✅ Successfully deducted ${finalQuantity} ${match.to_unit} of ${match.inventory_item_name} for ${ingredient.ingredient_name}`);
      }
    }

    // Log the deduction result
    await supabase
      .from('inventory_sync_audit')
      .upsert({
        transaction_id: transactionId,
        sync_status: result.success ? 'success' : 'failed',
        error_details: result.failedItems.length > 0 ? JSON.stringify(result.failedItems) : null,
        items_processed: result.deductedItems.length,
        sync_duration_ms: Date.now() - Date.now() // TODO: Implement proper timing
      });

    console.log(`🏁 Deduction completed. Success: ${result.success}, Deducted: ${result.deductedItems.length}, Failed: ${result.failedItems.length}`);

    if (!result.success) {
      toast.error(`Inventory deduction failed for ${result.failedItems.length} items`);
    } else if (result.warnings.length > 0) {
      toast.warning(`Inventory deduction completed with ${result.warnings.length} warnings`);
    } else {
      toast.success(`Successfully deducted ${result.deductedItems.length} inventory items`);
    }

    return result;

  } catch (error) {
    console.error('❌ Critical error in inventory deduction:', error);
    
    // Log critical error
    await supabase
      .from('inventory_sync_audit')
      .upsert({
        transaction_id: transactionId,
        sync_status: 'error',
        error_details: error instanceof Error ? error.message : 'Unknown error',
        items_processed: 0
      });

    return {
      success: false,
      deductedItems: [],
      failedItems: [{
        ingredient_name: 'System Error',
        reason: error instanceof Error ? error.message : 'Unknown error occurred',
        required_quantity: 0,
        available_quantity: 0
      }],
      warnings: []
    };
  }
};
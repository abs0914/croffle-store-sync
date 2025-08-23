import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReconciliationResult {
  transaction_id: string;
  success: boolean;
  corrections_made: number;
  errors: string[];
}

/**
 * Manually correct missing inventory deductions for a specific transaction
 */
export const correctTransactionInventory = async (
  transactionId: string
): Promise<ReconciliationResult> => {
  console.log('🔧 Starting manual inventory correction for transaction:', transactionId);
  
  const result: ReconciliationResult = {
    transaction_id: transactionId,
    success: true,
    corrections_made: 0,
    errors: []
  };

  try {
    // Get transaction details with proper table structure - search by receipt_number
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select(`
        id,
        store_id,
        items,
        total,
        receipt_number
      `)
      .eq('receipt_number', transactionId)
      .maybeSingle();

    if (transactionError || !transaction) {
      result.success = false;
      result.errors.push('Transaction not found');
      return result;
    }

    // Parse transaction items from JSON or use directly if already parsed
    const transactionItems = typeof transaction.items === 'string' 
      ? JSON.parse(transaction.items) 
      : transaction.items as Array<{ name: string; quantity: number }>;
    console.log(`📝 Processing corrections for ${transactionItems.length} items`);

    // Process each transaction item
    for (const item of transactionItems) {
      console.log(`📝 Processing corrections for ${item.name}`);

      // For now, we'll use a simplified approach - look up recipe by product name
      // This can be enhanced to use proper product->recipe mapping
      const { data: recipeTemplate, error: recipeError } = await supabase
        .from('recipe_templates')
        .select(`
          id,
          name,
          recipe_template_ingredients(
            ingredient_name,
            unit,
            quantity
          )
        `)
        .ilike('name', `%${item.name}%`)
        .limit(1)
        .maybeSingle();

      if (recipeError || !recipeTemplate) {
        result.errors.push(`No recipe template found for ${item.name}`);
        continue;
      }

      // Process each ingredient
      for (const ingredient of recipeTemplate.recipe_template_ingredients) {
        const requiredQuantity = ingredient.quantity * item.quantity;

        // Find matching inventory item with improved matching logic
        // First try exact match, then try partial matches
        let { data: inventoryItem, error: inventoryError } = await supabase
          .from('inventory_stock')
          .select('id, item, stock_quantity, serving_ready_quantity')
          .eq('store_id', transaction.store_id)
          .eq('is_active', true)
          .eq('item', ingredient.ingredient_name)
          .limit(1)
          .maybeSingle();

        // If no exact match, try partial matching
        if (!inventoryItem && !inventoryError) {
          const { data: partialMatch } = await supabase
            .from('inventory_stock')
            .select('id, item, stock_quantity, serving_ready_quantity')
            .eq('store_id', transaction.store_id)
            .eq('is_active', true)
            .ilike('item', `%${ingredient.ingredient_name.split(' ')[0]}%`) // Match first word
            .limit(1)
            .maybeSingle();
          
          inventoryItem = partialMatch;
        }

        if (inventoryError || !inventoryItem) {
          result.errors.push(`No inventory item found for ${ingredient.ingredient_name}`);
          continue;
        }

        // Check if deduction was already applied
        const { data: existingMovement } = await supabase
          .from('inventory_movements')
          .select('id')
          .eq('inventory_stock_id', inventoryItem.id)
          .ilike('notes', `%${transaction.id}%`)
          .limit(1);

        if (existingMovement && existingMovement.length > 0) {
          console.log(`✅ Deduction already exists for ${ingredient.ingredient_name}`);
          continue;
        }

        // Apply the missing deduction
        const currentQuantity = inventoryItem.serving_ready_quantity || inventoryItem.stock_quantity || 0;
        const newQuantity = Math.max(0, currentQuantity - requiredQuantity);

        const { error: updateError } = await supabase
          .from('inventory_stock')
          .update({
            serving_ready_quantity: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', inventoryItem.id);

        if (updateError) {
          result.errors.push(`Failed to update ${ingredient.ingredient_name}: ${updateError.message}`);
          continue;
        }

        // Log the correction
        await supabase
          .from('inventory_movements')
          .insert({
            inventory_stock_id: inventoryItem.id,
            movement_type: 'correction',
            quantity_change: -requiredQuantity,
            previous_quantity: currentQuantity,
            new_quantity: newQuantity,
            notes: `Manual correction for transaction ${transaction.id} (${transactionId}) - Missing deduction for ${item.name}`,
            created_by: 'manual-correction'
          });

        result.corrections_made += 1;
        console.log(`✅ Corrected inventory for ${ingredient.ingredient_name}: ${requiredQuantity} deducted`);
      }
    }

    // Update inventory sync audit
    await supabase
      .from('inventory_sync_audit')
      .upsert({
        transaction_id: transaction.id, // Use the actual transaction UUID
        sync_status: result.errors.length === 0 ? 'corrected' : 'partial_correction',
        error_details: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
        items_processed: result.corrections_made
      });

    if (result.corrections_made > 0) {
      toast.success(`Successfully corrected ${result.corrections_made} inventory items`);
    }

    if (result.errors.length > 0) {
      toast.warning(`Correction completed with ${result.errors.length} issues`);
      result.success = false;
    }

    return result;

  } catch (error) {
    console.error('❌ Error in manual inventory correction:', error);
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    toast.error('Failed to correct inventory');
    return result;
  }
};

/**
 * Batch correction for multiple transactions
 */
export const batchCorrectInventory = async (
  transactionIds: string[]
): Promise<ReconciliationResult[]> => {
  const results: ReconciliationResult[] = [];
  
  for (const transactionId of transactionIds) {
    const result = await correctTransactionInventory(transactionId);
    results.push(result);
    
    // Add delay to prevent overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
};
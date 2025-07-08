
import { supabase } from '@/integrations/supabase/client';
import type { InventoryDeductionRequirement } from './types';
import { validateMappingData } from './utils';

/**
 * Get inventory deduction requirements for a recipe
 */
export const getInventoryDeductionRequirements = async (
  recipeId: string,
  quantity: number = 1
): Promise<InventoryDeductionRequirement[]> => {
  try {
    // Get recipe ingredients with their mappings
    const { data: ingredients } = await supabase
      .from('recipe_ingredients')
      .select(`
        *,
        inventory_conversion_mappings!inner(
          inventory_stock_id,
          conversion_factor
        )
      `)
      .eq('recipe_id', recipeId);

    if (!ingredients) return [];

    const deductionRequirements: InventoryDeductionRequirement[] = [];

    for (const ingredient of ingredients) {
      // Handle the mapping data properly
      let mappingData = ingredient.inventory_conversion_mappings;
      
      // If it's an array, take the first element
      if (Array.isArray(mappingData)) {
        mappingData = mappingData[0];
      }
      
      // Use the type guard to validate the mapping data
      if (validateMappingData(mappingData)) {
        // Calculate how much to deduct from bulk inventory
        const recipeQuantityNeeded = ingredient.quantity * quantity;
        const bulkDeductionQuantity = recipeQuantityNeeded / mappingData.conversion_factor;

        // Get inventory item details
        const { data: inventoryItem } = await supabase
          .from('inventory_stock')
          .select('item, unit')
          .eq('id', mappingData.inventory_stock_id)
          .single();

        if (inventoryItem) {
          deductionRequirements.push({
            inventory_stock_id: mappingData.inventory_stock_id,
            item_name: inventoryItem.item,
            deduction_quantity: bulkDeductionQuantity,
            unit: inventoryItem.unit
          });
        }
      }
    }

    return deductionRequirements;
  } catch (error) {
    console.error('Error getting inventory deduction requirements:', error);
    return [];
  }
};

/**
 * Process inventory deductions for recipe usage
 */
export const processRecipeInventoryDeductions = async (
  recipeId: string,
  quantity: number,
  storeId: string,
  usedBy: string,
  transactionId?: string
): Promise<boolean> => {
  try {
    const deductionRequirements = await getInventoryDeductionRequirements(recipeId, quantity);

    for (const requirement of deductionRequirements) {
      // Update inventory stock
      const { data: currentStock } = await supabase
        .from('inventory_stock')
        .select('stock_quantity, fractional_stock')
        .eq('id', requirement.inventory_stock_id)
        .single();

      if (currentStock) {
        const totalCurrentStock = currentStock.stock_quantity + (currentStock.fractional_stock || 0);
        const newTotalStock = totalCurrentStock - requirement.deduction_quantity;
        
        // Split into whole and fractional parts
        const newWholeStock = Math.floor(newTotalStock);
        const newFractionalStock = newTotalStock - newWholeStock;

        await supabase
          .from('inventory_stock')
          .update({
            stock_quantity: newWholeStock,
            fractional_stock: newFractionalStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', requirement.inventory_stock_id);

        // Log the transaction
        await supabase
          .from('inventory_transactions')
          .insert({
            store_id: storeId,
            product_id: requirement.inventory_stock_id,
            transaction_type: 'recipe_usage',
            quantity: requirement.deduction_quantity,
            previous_quantity: totalCurrentStock,
            new_quantity: newTotalStock,
            created_by: usedBy,
            reference_id: transactionId,
            notes: `Recipe usage deduction: ${requirement.item_name}`
          });
      }
    }

    return true;
  } catch (error) {
    console.error('Error processing recipe inventory deductions:', error);
    return false;
  }
};

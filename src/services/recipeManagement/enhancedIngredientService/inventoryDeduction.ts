
import { supabase } from '@/integrations/supabase/client';
import type { InventoryDeductionRequirement } from './types';
import { validateMappingData } from './utils';

/**
 * Get inventory deduction requirements for a recipe template (store inventory only)
 */
export const getInventoryDeductionRequirements = async (
  recipeTemplateId: string,
  quantity: number = 1
): Promise<InventoryDeductionRequirement[]> => {
  try {
    // Get recipe template ingredients that use store inventory
    const { data: ingredients } = await supabase
      .from('recipe_template_ingredients')
      .select(`
        *,
        inventory_stock:inventory_stock_id (
          id,
          item,
          unit
        )
      `)
      .eq('recipe_template_id', recipeTemplateId)
      .eq('uses_store_inventory', true);

    if (!ingredients) return [];

    const deductionRequirements: InventoryDeductionRequirement[] = [];

    for (const ingredient of ingredients) {
      if (ingredient.inventory_stock_id && ingredient.recipe_to_store_conversion_factor) {
        // Calculate deduction: recipe quantity ÷ conversion factor = store units needed
        const recipeQuantityNeeded = ingredient.quantity * quantity;
        const storeUnitsNeeded = recipeQuantityNeeded / ingredient.recipe_to_store_conversion_factor;

        deductionRequirements.push({
          inventory_stock_id: ingredient.inventory_stock_id,
          item_name: ingredient.ingredient_name,
          deduction_quantity: storeUnitsNeeded,
          unit: ingredient.store_unit
        });
      }
    }

    return deductionRequirements;
  } catch (error) {
    console.error('Error getting inventory deduction requirements:', error);
    return [];
  }
};

/**
 * Process inventory deductions for recipe usage (simplified for store inventory)
 */
export const processRecipeInventoryDeductions = async (
  recipeTemplateId: string,
  quantity: number,
  storeId: string,
  usedBy: string,
  transactionId?: string
): Promise<boolean> => {
  try {
    const deductionRequirements = await getInventoryDeductionRequirements(recipeTemplateId, quantity);

    for (const requirement of deductionRequirements) {
      // Update inventory stock for the specific store
      const { data: currentStock } = await supabase
        .from('inventory_stock')
        .select('stock_quantity, fractional_stock')
        .eq('id', requirement.inventory_stock_id)
        .eq('store_id', storeId)
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
          .eq('id', requirement.inventory_stock_id)
          .eq('store_id', storeId);

        // Log the transaction
        await supabase
          .from('inventory_transactions')
          .insert({
            store_id: storeId,
            product_id: requirement.inventory_stock_id,
            transaction_type: 'recipe_template_usage',
            quantity: requirement.deduction_quantity,
            previous_quantity: totalCurrentStock,
            new_quantity: newTotalStock,
            created_by: usedBy,
            reference_id: transactionId,
            notes: `Recipe template usage deduction: ${requirement.item_name}`
          });
      }
    }

    return true;
  } catch (error) {
    console.error('Error processing recipe inventory deductions:', error);
    return false;
  }
};

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BulkToServingCalculation {
  bulkQuantity: number;
  servingQuantity: number;
  breakdownRatio: number;
  costPerServing: number;
}

/**
 * Calculate serving breakdown from bulk quantities
 */
export const calculateServingBreakdown = (
  bulkQuantity: number,
  breakdownRatio: number,
  bulkCost: number
): BulkToServingCalculation => {
  const servingQuantity = bulkQuantity * breakdownRatio;
  const costPerServing = breakdownRatio > 0 ? bulkCost / breakdownRatio : bulkCost;
  
  return {
    bulkQuantity,
    servingQuantity,
    breakdownRatio,
    costPerServing
  };
};

/**
 * Get breakdown ratios for Mini Croffle items (half servings)
 */
export const getMiniCroffleBreakdownRatio = (itemName: string): number => {
  const miniCroffleItems = [
    'Croissant',
    'Whipped Cream',
    'Chocolate Sauce',
    'Caramel Sauce',
    'Tiramisu Sauce',
    'Colored Sprinkle',
    'Peanut',
    'Choco Flakes',
    'Marshmallow'
  ];
  
  return miniCroffleItems.includes(itemName) ? 0.5 : 1;
};

/**
 * Update inventory item with bulk-to-serving breakdown
 */
export const updateInventoryWithBulkBreakdown = async (
  inventoryId: string,
  bulkQuantity: number,
  bulkUnit: string,
  servingUnit: string,
  breakdownRatio: number,
  bulkCost: number
): Promise<boolean> => {
  try {
    const calculation = calculateServingBreakdown(bulkQuantity, breakdownRatio, bulkCost);
    
    const { error } = await supabase
      .from('inventory_stock')
      .update({
        bulk_quantity: calculation.bulkQuantity,
        bulk_unit: bulkUnit,
        serving_quantity: calculation.servingQuantity,
        serving_unit: servingUnit,
        breakdown_ratio: calculation.breakdownRatio,
        cost_per_serving: calculation.costPerServing,
        updated_at: new Date().toISOString()
      })
      .eq('id', inventoryId);

    if (error) throw error;
    
    toast.success('Inventory breakdown updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating inventory breakdown:', error);
    toast.error('Failed to update inventory breakdown');
    return false;
  }
};

/**
 * Get serving-ready inventory for recipes
 */
export const getServingReadyInventory = async (storeId: string) => {
  try {
    const { data, error } = await supabase
      .from('serving_ready_inventory')
      .select('*')
      .eq('store_id', storeId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching serving-ready inventory:', error);
    toast.error('Failed to load serving inventory');
    return [];
  }
};

/**
 * Update fractional stock (for partial usage tracking)
 */
export const updateFractionalStock = async (
  inventoryId: string,
  fractionalAmount: number
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('inventory_stock')
      .update({
        fractional_stock: fractionalAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', inventoryId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating fractional stock:', error);
    return false;
  }
};
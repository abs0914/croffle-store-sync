import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StoreInventoryItem {
  id: string;
  item: string;
  unit: string;
  cost: number;
  store_id: string;
  stock_quantity: number;
}

/**
 * Get store inventory items for recipe template creation
 */
export const getStoreInventoryItems = async (storeId?: string): Promise<StoreInventoryItem[]> => {
  try {
    let query = supabase
      .from('inventory_stock')
      .select('id, item, unit, cost, store_id, stock_quantity')
      .eq('is_active', true)
      .order('item');

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching store inventory items:', error);
    toast.error('Failed to load store inventory items');
    return [];
  }
};

/**
 * Calculate recipe cost based on store inventory
 */
export const calculateRecipeTemplateStoreCost = async (
  ingredients: Array<{
    inventory_stock_id: string;
    quantity: number;
    recipe_to_store_conversion_factor: number;
  }>
): Promise<number> => {
  try {
    let totalCost = 0;

    for (const ingredient of ingredients) {
      const { data: inventoryItem } = await supabase
        .from('inventory_stock')
        .select('cost')
        .eq('id', ingredient.inventory_stock_id)
        .single();

      if (inventoryItem?.cost) {
        const storeUnitsNeeded = ingredient.quantity / ingredient.recipe_to_store_conversion_factor;
        const ingredientCost = storeUnitsNeeded * inventoryItem.cost;
        totalCost += ingredientCost;
      }
    }

    return totalCost;
  } catch (error) {
    console.error('Error calculating recipe template cost:', error);
    return 0;
  }
};

/**
 * Validate that all required store inventory items exist and have adequate stock
 */
export const validateStoreInventoryAvailability = async (
  storeId: string,
  ingredients: Array<{
    inventory_stock_id: string;
    quantity: number;
    recipe_to_store_conversion_factor: number;
  }>
): Promise<{ valid: boolean; issues: string[] }> => {
  try {
    const issues: string[] = [];

    for (const ingredient of ingredients) {
      const { data: inventoryItem } = await supabase
        .from('inventory_stock')
        .select('item, stock_quantity, fractional_stock')
        .eq('id', ingredient.inventory_stock_id)
        .eq('store_id', storeId)
        .single();

      if (!inventoryItem) {
        issues.push(`Inventory item not found in store: ${ingredient.inventory_stock_id}`);
        continue;
      }

      const totalStock = inventoryItem.stock_quantity + (inventoryItem.fractional_stock || 0);
      const requiredStock = ingredient.quantity / ingredient.recipe_to_store_conversion_factor;

      if (totalStock < requiredStock) {
        issues.push(`Insufficient stock for ${inventoryItem.item}: ${totalStock} available, ${requiredStock} required`);
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  } catch (error) {
    console.error('Error validating store inventory availability:', error);
    return {
      valid: false,
      issues: ['Error validating inventory availability']
    };
  }
};
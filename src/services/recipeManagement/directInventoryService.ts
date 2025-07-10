import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Mini Croffle ingredients that support half servings (0.5)
export const MINI_CROFFLE_INGREDIENTS = [
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

// Direct inventory units (no conversion needed)
export const DIRECT_INVENTORY_UNITS = [
  'pieces', 'piece', 'serving', 'portion', 'scoop', 'cup', 'tbsp', 'tsp'
];

export interface DirectInventoryIngredient {
  ingredient_name: string;
  quantity: number; // Can be fractional (0.5, 1.5, etc.)
  unit: string; // Direct inventory unit
  inventory_stock_id?: string;
  commissary_item_id?: string;
  estimated_cost_per_unit?: number;
  location_type: 'all' | 'inside_cebu' | 'outside_cebu';
  supports_fractional: boolean; // Auto-determined based on ingredient name
}

/**
 * Check if an ingredient supports fractional quantities
 */
export const supportsFractionalQuantity = (ingredientName: string): boolean => {
  return MINI_CROFFLE_INGREDIENTS.some(miniIngredient => 
    ingredientName.toLowerCase().includes(miniIngredient.toLowerCase())
  );
};

/**
 * Validate quantity based on ingredient type
 */
export const validateIngredientQuantity = (ingredientName: string, quantity: number): boolean => {
  const supportsFractional = supportsFractionalQuantity(ingredientName);
  
  if (supportsFractional) {
    // Allow fractional quantities like 0.5, 1.5, etc.
    return quantity > 0 && quantity <= 100; // Reasonable upper limit
  } else {
    // Only allow whole numbers for regular ingredients
    return quantity > 0 && Number.isInteger(quantity) && quantity <= 1000;
  }
};

/**
 * Get available inventory items for direct use (serving-ready units)
 */
export const getDirectInventoryItems = async (storeId?: string) => {
  try {
    let query = supabase
      .from('inventory_stock')
      .select(`
        id,
        item,
        unit,
        stock_quantity,
        serving_ready_quantity,
        cost,
        store_id,
        is_fractional_supported
      `)
      .eq('is_active', true)
      .order('item');

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(item => ({
      ...item,
      display_unit: item.unit,
      available_servings: item.serving_ready_quantity || item.stock_quantity || 0,
      cost_per_unit: item.cost || 0,
      supports_fractional: item.is_fractional_supported || supportsFractionalQuantity(item.item)
    }));
  } catch (error) {
    console.error('Error fetching direct inventory items:', error);
    return [];
  }
};

/**
 * Get available commissary inventory items for recipe templates
 */
export const getCommissaryInventoryItems = async () => {
  try {
    console.log('🔍 Fetching commissary inventory items...');
    const { data, error } = await supabase
      .from('commissary_inventory')
      .select(`
        id,
        name,
        unit,
        current_stock,
        unit_cost,
        is_active
      `)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('❌ Error fetching commissary inventory:', error);
      throw error;
    }

    console.log('✅ Commissary inventory data:', data);
    const mappedData = (data || []).map(item => ({
      id: item.id,
      item: item.name,
      display_unit: item.unit,
      available_servings: item.current_stock || 0,
      cost_per_unit: item.unit_cost || 0,
      supports_fractional: supportsFractionalQuantity(item.name),
      commissary_item_id: item.id,
      unit: item.unit
    }));
    
    console.log('🔄 Mapped commissary items:', mappedData);
    return mappedData;
  } catch (error) {
    console.error('Error fetching commissary inventory items:', error);
    return [];
  }
};

/**
 * Calculate total recipe cost using direct inventory pricing
 */
export const calculateDirectRecipeCost = (ingredients: DirectInventoryIngredient[]): number => {
  return ingredients.reduce((total, ingredient) => {
    const cost = (ingredient.estimated_cost_per_unit || 0) * ingredient.quantity;
    return total + cost;
  }, 0);
};

/**
 * Deduct ingredients from inventory (supports fractional deductions)
 */
export const deductDirectInventoryIngredients = async (
  recipeId: string,
  ingredients: DirectInventoryIngredient[],
  multiplier: number = 1
): Promise<boolean> => {
  try {
    const deductions = [];

    for (const ingredient of ingredients) {
      if (!ingredient.inventory_stock_id) continue;

      const quantityToDeduct = ingredient.quantity * multiplier;
      
      // Get current inventory stock
      const { data: currentStock, error: fetchError } = await supabase
        .from('inventory_stock')
        .select('stock_quantity, serving_ready_quantity, item')
        .eq('id', ingredient.inventory_stock_id)
        .single();

      if (fetchError) {
        console.error('Error fetching inventory stock:', fetchError);
        continue;
      }

      const totalCurrentStock = currentStock.serving_ready_quantity || currentStock.stock_quantity || 0;

      if (totalCurrentStock < quantityToDeduct) {
        toast.error(`Insufficient stock for ${ingredient.ingredient_name}. Available: ${totalCurrentStock}, Required: ${quantityToDeduct}`);
        return false;
      }

      // Calculate new stock levels  
      const newTotalStock = totalCurrentStock - quantityToDeduct;

      deductions.push({
        inventory_stock_id: ingredient.inventory_stock_id,
        ingredient_name: ingredient.ingredient_name,
        quantity_deducted: quantityToDeduct,
        newStock: Math.max(0, newTotalStock)
      });
    }

    // Apply all deductions
    for (const deduction of deductions) {
      const { error: updateError } = await supabase
        .from('inventory_stock')
        .update({
          serving_ready_quantity: deduction.newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', deduction.inventory_stock_id);

      if (updateError) {
        console.error('Error updating inventory stock:', updateError);
        return false;
      }

      // Get store_id for transaction logging
      const { data: stockData } = await supabase
        .from('inventory_stock')
        .select('store_id')
        .eq('id', deduction.inventory_stock_id)
        .single();

      if (stockData?.store_id) {
        // Log the transaction
        await supabase
          .from('inventory_transactions')
          .insert({
            store_id: stockData.store_id,
            product_id: deduction.inventory_stock_id,
            transaction_type: 'recipe_usage',
            quantity: deduction.quantity_deducted,
            previous_quantity: deduction.newStock + deduction.quantity_deducted,
            new_quantity: deduction.newStock,
            notes: `Recipe usage for recipe ${recipeId} - Direct inventory deduction`,
            reference_id: recipeId,
            created_by: 'system' // TODO: Get actual user ID from auth context
          });
      }
    }

    return true;
  } catch (error) {
    console.error('Error deducting direct inventory ingredients:', error);
    return false;
  }
};

/**
 * Check ingredient availability for recipe production
 */
export const checkDirectIngredientAvailability = async (
  ingredients: DirectInventoryIngredient[],
  storeId: string,
  multiplier: number = 1
): Promise<{
  available: boolean;
  unavailableItems: Array<{
    ingredient_name: string;
    required: number;
    available: number;
  }>;
}> => {
  const unavailableItems = [];

  try {
    for (const ingredient of ingredients) {
      if (!ingredient.inventory_stock_id) continue;

      const requiredQuantity = ingredient.quantity * multiplier;

      const { data: stock, error } = await supabase
        .from('inventory_stock')
        .select('serving_ready_quantity, stock_quantity')
        .eq('id', ingredient.inventory_stock_id)
        .eq('store_id', storeId)
        .single();

      if (error || !stock) {
        unavailableItems.push({
          ingredient_name: ingredient.ingredient_name,
          required: requiredQuantity,
          available: 0
        });
        continue;
      }

      const totalAvailable = stock.serving_ready_quantity || stock.stock_quantity || 0;
      
      if (totalAvailable < requiredQuantity) {
        unavailableItems.push({
          ingredient_name: ingredient.ingredient_name,
          required: requiredQuantity,
          available: totalAvailable
        });
      }
    }

    return {
      available: unavailableItems.length === 0,
      unavailableItems
    };
  } catch (error) {
    console.error('Error checking ingredient availability:', error);
    return {
      available: false,
      unavailableItems: ingredients.map(ing => ({
        ingredient_name: ing.ingredient_name,
        required: ing.quantity * multiplier,
        available: 0
      }))
    };
  }
};

/**
 * Convert legacy recipe ingredients to direct inventory format
 */
export const convertToDirectInventoryIngredients = (
  legacyIngredients: any[]
): DirectInventoryIngredient[] => {
  return legacyIngredients.map(ingredient => ({
    ingredient_name: ingredient.ingredient_name,
    quantity: ingredient.quantity,
    unit: ingredient.unit || 'pieces',
    inventory_stock_id: ingredient.inventory_stock_id,
    estimated_cost_per_unit: ingredient.cost_per_unit || 0,
    location_type: ingredient.location_type || 'all',
    supports_fractional: supportsFractionalQuantity(ingredient.ingredient_name)
  }));
};
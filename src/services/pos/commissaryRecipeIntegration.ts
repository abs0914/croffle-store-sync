import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CommissaryRecipeUsage {
  recipe_id: string;
  quantity_used: number;
  store_id: string;
  transaction_id?: string;
  notes?: string;
}

export interface CommissaryInventoryDeductionResult {
  success: boolean;
  deductions: {
    commissary_item_id: string;
    item_name: string;
    quantity_deducted: number;
    remaining_stock: number;
    insufficient_stock?: boolean;
  }[];
  errors: string[];
}

export const deductCommissaryInventoryForRecipe = async (
  recipeUsage: CommissaryRecipeUsage,
  userId: string
): Promise<CommissaryInventoryDeductionResult> => {
  const result: CommissaryInventoryDeductionResult = {
    success: false,
    deductions: [],
    errors: []
  };

  try {
    // Fetch the recipe with its ingredients from commissary
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select(`
        *,
        ingredients:recipe_ingredients(
          *,
          commissary_item:commissary_inventory(*)
        )
      `)
      .eq('id', recipeUsage.recipe_id)
      .single();

    if (recipeError || !recipe) {
      result.errors.push(`Recipe not found: ${recipeUsage.recipe_id}`);
      return result;
    }

    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      result.errors.push(`Recipe "${recipe.name}" has no commissary ingredients defined`);
      return result;
    }

    // Process each commissary ingredient deduction
    for (const ingredient of recipe.ingredients) {
      if (!ingredient.commissary_item_id || !ingredient.commissary_item) {
        continue; // Skip if no commissary item linked
      }

      const requiredQuantity = ingredient.quantity * recipeUsage.quantity_used;
      const currentStock = ingredient.commissary_item.current_stock || 0;
      
      if (currentStock < requiredQuantity) {
        result.errors.push(
          `Insufficient commissary stock for ${ingredient.commissary_item.name}: ` +
          `Required ${requiredQuantity} ${ingredient.unit}, Available ${currentStock}`
        );
        result.deductions.push({
          commissary_item_id: ingredient.commissary_item_id,
          item_name: ingredient.commissary_item.name,
          quantity_deducted: requiredQuantity,
          remaining_stock: currentStock,
          insufficient_stock: true
        });
      } else {
        try {
          // Update commissary stock
          const { data: updatedStock, error: updateError } = await supabase
            .from('commissary_inventory')
            .update({
              current_stock: currentStock - requiredQuantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', ingredient.commissary_item_id)
            .select()
            .single();

          if (updateError) {
            result.errors.push(`Failed to update commissary stock for ${ingredient.commissary_item.name}: ${updateError.message}`);
            continue;
          }

          result.deductions.push({
            commissary_item_id: ingredient.commissary_item_id,
            item_name: ingredient.commissary_item.name,
            quantity_deducted: requiredQuantity,
            remaining_stock: updatedStock?.current_stock || 0
          });

        } catch (error) {
          console.error(`Error deducting commissary stock for ingredient ${ingredient.commissary_item_id}:`, error);
          result.errors.push(`Failed to deduct commissary stock for ${ingredient.commissary_item.name}: ${error}`);
        }
      }
    }

    // Create recipe usage record
    try {
      await supabase
        .from('recipe_usage_log')
        .insert({
          recipe_id: recipeUsage.recipe_id,
          store_id: recipeUsage.store_id,
          quantity_used: recipeUsage.quantity_used,
          used_by: userId,
          transaction_id: recipeUsage.transaction_id,
          notes: recipeUsage.notes,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to log recipe usage:', error);
    }

    result.success = result.errors.length === 0;
    return result;

  } catch (error) {
    console.error('Error in deductCommissaryInventoryForRecipe:', error);
    result.errors.push(`System error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
};

export const checkCommissaryRecipeAvailability = async (
  recipeId: string,
  quantityNeeded: number
): Promise<{
  canMake: boolean;
  maxQuantity: number;
  missingIngredients: string[];
}> => {
  try {
    const { data: recipe, error } = await supabase
      .from('recipes')
      .select(`
        *,
        ingredients:recipe_ingredients(
          *,
          commissary_item:commissary_inventory(*)
        )
      `)
      .eq('id', recipeId)
      .single();

    if (error || !recipe) {
      return { canMake: false, maxQuantity: 0, missingIngredients: ['Recipe not found'] };
    }

    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      return { canMake: false, maxQuantity: 0, missingIngredients: ['No commissary ingredients defined'] };
    }

    let maxQuantity = Infinity;
    const missingIngredients: string[] = [];

    for (const ingredient of recipe.ingredients) {
      if (!ingredient.commissary_item_id || !ingredient.commissary_item) {
        continue; // Skip non-commissary ingredients
      }

      const currentStock = ingredient.commissary_item.current_stock || 0;
      const requiredPerUnit = ingredient.quantity;

      if (currentStock <= 0) {
        missingIngredients.push(ingredient.commissary_item.name || 'Unknown ingredient');
        maxQuantity = 0;
      } else {
        const possibleQuantity = Math.floor(currentStock / requiredPerUnit);
        maxQuantity = Math.min(maxQuantity, possibleQuantity);
      }
    }

    const canMake = maxQuantity >= quantityNeeded && missingIngredients.length === 0;
    
    return {
      canMake,
      maxQuantity: maxQuantity === Infinity ? 0 : maxQuantity,
      missingIngredients
    };

  } catch (error) {
    console.error('Error checking commissary recipe availability:', error);
    return { canMake: false, maxQuantity: 0, missingIngredients: ['System error'] };
  }
};

export const getCommissaryLowStockAlerts = async (lowStockThreshold: number = 5): Promise<{
  item_name: string;
  current_stock: number;
  low_stock_threshold: number;
  affected_recipes: string[];
}[]> => {
  try {
    const { data: lowStockItems, error } = await supabase
      .from('commissary_inventory')
      .select(`
        *,
        recipe_ingredients(
          recipe:recipes(name)
        )
      `)
      .lte('current_stock', lowStockThreshold)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching commissary low stock alerts:', error);
      return [];
    }

    return (lowStockItems || []).map(item => ({
      item_name: item.name,
      current_stock: item.current_stock,
      low_stock_threshold: lowStockThreshold,
      affected_recipes: item.recipe_ingredients?.map((ri: any) => ri.recipe?.name).filter(Boolean) || []
    }));

  } catch (error) {
    console.error('Error getting commissary ingredient alerts:', error);
    return [];
  }
};

export const processCommissaryToStoreConversion = async (
  commissaryItemId: string,
  storeId: string,
  quantityToConvert: number,
  storeItemName: string,
  storeItemUnit: string,
  conversionRatio: number = 1,
  userId: string
): Promise<boolean> => {
  try {
    // Get commissary item
    const { data: commissaryItem, error: commissaryError } = await supabase
      .from('commissary_inventory')
      .select('*')
      .eq('id', commissaryItemId)
      .single();

    if (commissaryError || !commissaryItem) {
      toast.error('Commissary item not found');
      return false;
    }

    if (commissaryItem.current_stock < quantityToConvert) {
      toast.error('Insufficient commissary stock for conversion');
      return false;
    }

    // Check if store item exists
    let storeItem;
    const { data: existingStoreItem } = await supabase
      .from('inventory_stock')
      .select('*')
      .eq('store_id', storeId)
      .eq('item', storeItemName)
      .eq('unit', storeItemUnit)
      .single();

    if (existingStoreItem) {
      storeItem = existingStoreItem;
    } else {
      // Create new store item
      const { data: newStoreItem, error: createError } = await supabase
        .from('inventory_stock')
        .insert({
          store_id: storeId,
          item: storeItemName,
          unit: storeItemUnit,
          stock_quantity: 0,
          is_active: true
        })
        .select()
        .single();

      if (createError) {
        toast.error('Failed to create store inventory item');
        return false;
      }
      storeItem = newStoreItem;
    }

    // Calculate converted quantity
    const convertedQuantity = quantityToConvert * conversionRatio;

    // Update commissary stock (decrease)
    const { error: commissaryUpdateError } = await supabase
      .from('commissary_inventory')
      .update({
        current_stock: commissaryItem.current_stock - quantityToConvert
      })
      .eq('id', commissaryItemId);

    if (commissaryUpdateError) {
      toast.error('Failed to update commissary stock');
      return false;
    }

    // Update store stock (increase)
    const { error: storeUpdateError } = await supabase
      .from('inventory_stock')
      .update({
        stock_quantity: storeItem.stock_quantity + convertedQuantity
      })
      .eq('id', storeItem.id);

    if (storeUpdateError) {
      toast.error('Failed to update store stock');
      return false;
    }

    // Log the conversion
    await supabase
      .from('inventory_conversions')
      .insert({
        store_id: storeId,
        commissary_item_id: commissaryItemId,
        inventory_stock_id: storeItem.id,
        finished_goods_quantity: convertedQuantity,
        converted_by: userId,
        notes: `Converted ${quantityToConvert} ${commissaryItem.unit} to ${convertedQuantity} ${storeItemUnit}`
      });

    toast.success('Conversion completed successfully');
    return true;

  } catch (error) {
    console.error('Error processing commissary to store conversion:', error);
    toast.error('Failed to process conversion');
    return false;
  }
};

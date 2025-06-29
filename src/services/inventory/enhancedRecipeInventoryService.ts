
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  InventoryDeductionRequest, 
  InventoryDeductionResult, 
  AvailabilityCheck 
} from "@/types/conversionMapping";
import { findConversionMapping } from "./conversionMappingService";

export const checkIngredientAvailability = async (
  storeId: string,
  ingredientName: string,
  ingredientUnit: string,
  requiredQuantity: number
): Promise<AvailabilityCheck> => {
  try {
    // Find the conversion mapping
    const mapping = await findConversionMapping(storeId, ingredientName, ingredientUnit);
    
    if (!mapping || !mapping.inventory_stock) {
      return {
        recipe_ingredient_name: ingredientName,
        recipe_ingredient_unit: ingredientUnit,
        required_quantity: requiredQuantity,
        available_quantity: 0,
        is_sufficient: false
      };
    }

    const { inventory_stock } = mapping;
    const totalAvailableStock = inventory_stock.stock_quantity + (inventory_stock.fractional_stock || 0);
    const availableIngredientQuantity = totalAvailableStock * mapping.conversion_factor;

    return {
      recipe_ingredient_name: ingredientName,
      recipe_ingredient_unit: ingredientUnit,
      required_quantity: requiredQuantity,
      available_quantity: availableIngredientQuantity,
      is_sufficient: availableIngredientQuantity >= requiredQuantity,
      inventory_stock_id: inventory_stock.id
    };
  } catch (error) {
    console.error('Error checking ingredient availability:', error);
    return {
      recipe_ingredient_name: ingredientName,
      recipe_ingredient_unit: ingredientUnit,
      required_quantity: requiredQuantity,
      available_quantity: 0,
      is_sufficient: false
    };
  }
};

export const deductIngredientFromInventory = async (
  request: InventoryDeductionRequest
): Promise<InventoryDeductionResult> => {
  try {
    // Find the conversion mapping
    const mapping = await findConversionMapping(
      request.store_id,
      request.recipe_ingredient_name,
      request.recipe_ingredient_unit
    );

    if (!mapping || !mapping.inventory_stock) {
      return {
        success: false,
        deducted_quantity: 0,
        remaining_stock: 0,
        remaining_fractional_stock: 0,
        error: `No conversion mapping found for ${request.recipe_ingredient_name} (${request.recipe_ingredient_unit})`
      };
    }

    const { inventory_stock } = mapping;
    const requiredInventoryUnits = request.quantity / mapping.conversion_factor;
    
    // Calculate current total stock
    const currentWholeStock = inventory_stock.stock_quantity;
    const currentFractionalStock = inventory_stock.fractional_stock || 0;
    const totalCurrentStock = currentWholeStock + currentFractionalStock;

    if (totalCurrentStock < requiredInventoryUnits) {
      return {
        success: false,
        deducted_quantity: 0,
        remaining_stock: currentWholeStock,
        remaining_fractional_stock: currentFractionalStock,
        error: `Insufficient stock: need ${requiredInventoryUnits.toFixed(3)} ${inventory_stock.unit}, have ${totalCurrentStock.toFixed(3)}`
      };
    }

    // Calculate new stock levels
    const newTotalStock = totalCurrentStock - requiredInventoryUnits;
    const newWholeStock = Math.floor(newTotalStock);
    const newFractionalStock = newTotalStock - newWholeStock;

    // Update inventory stock
    const { error: updateError } = await supabase
      .from('inventory_stock')
      .update({
        stock_quantity: newWholeStock,
        fractional_stock: newFractionalStock
      })
      .eq('id', inventory_stock.id);

    if (updateError) throw updateError;

    // Log the movement
    const { error: movementError } = await supabase
      .from('inventory_movements')
      .insert({
        inventory_stock_id: inventory_stock.id,
        movement_type: 'recipe_deduction',
        quantity_change: -Math.round(requiredInventoryUnits),
        previous_quantity: currentWholeStock,
        new_quantity: newWholeStock,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        reference_type: 'recipe_ingredient',
        reference_id: null,
        notes: `Recipe ingredient deduction: ${request.recipe_ingredient_name} (${request.quantity} ${request.recipe_ingredient_unit})`
      });

    if (movementError) {
      console.error('Failed to log movement:', movementError);
      // Don't fail the transaction for logging issues
    }

    return {
      success: true,
      inventory_stock_id: inventory_stock.id,
      deducted_quantity: requiredInventoryUnits,
      remaining_stock: newWholeStock,
      remaining_fractional_stock: newFractionalStock
    };
  } catch (error) {
    console.error('Error deducting ingredient from inventory:', error);
    return {
      success: false,
      deducted_quantity: 0,
      remaining_stock: 0,
      remaining_fractional_stock: 0,
      error: 'Failed to deduct ingredient from inventory'
    };
  }
};

export const bulkCheckAvailability = async (
  storeId: string,
  ingredients: Array<{
    name: string;
    unit: string;
    quantity: number;
  }>
): Promise<AvailabilityCheck[]> => {
  try {
    const availabilityPromises = ingredients.map(ingredient =>
      checkIngredientAvailability(storeId, ingredient.name, ingredient.unit, ingredient.quantity)
    );

    return await Promise.all(availabilityPromises);
  } catch (error) {
    console.error('Error bulk checking availability:', error);
    return [];
  }
};

export const bulkDeductIngredients = async (
  requests: InventoryDeductionRequest[]
): Promise<InventoryDeductionResult[]> => {
  try {
    const deductionPromises = requests.map(request => deductIngredientFromInventory(request));
    return await Promise.all(deductionPromises);
  } catch (error) {
    console.error('Error bulk deducting ingredients:', error);
    return [];
  }
};

export const processRecipeForOrder = async (
  storeId: string,
  recipeIngredients: Array<{
    name: string;
    unit: string;
    quantity: number;
  }>,
  orderQuantity: number = 1
): Promise<{ success: boolean; results: InventoryDeductionResult[]; insufficientItems: string[] }> => {
  try {
    // First, check availability for all ingredients
    const availabilityChecks = await bulkCheckAvailability(
      storeId,
      recipeIngredients.map(ing => ({
        name: ing.name,
        unit: ing.unit,
        quantity: ing.quantity * orderQuantity
      }))
    );

    const insufficientItems = availabilityChecks
      .filter(check => !check.is_sufficient)
      .map(check => `${check.recipe_ingredient_name} (need ${check.required_quantity}, have ${check.available_quantity})`);

    if (insufficientItems.length > 0) {
      return {
        success: false,
        results: [],
        insufficientItems
      };
    }

    // If all ingredients are available, proceed with deduction
    const deductionRequests: InventoryDeductionRequest[] = recipeIngredients.map(ingredient => ({
      recipe_ingredient_name: ingredient.name,
      recipe_ingredient_unit: ingredient.unit,
      quantity: ingredient.quantity * orderQuantity,
      store_id: storeId
    }));

    const results = await bulkDeductIngredients(deductionRequests);
    const allSuccessful = results.every(result => result.success);

    return {
      success: allSuccessful,
      results,
      insufficientItems: allSuccessful ? [] : results
        .filter(result => !result.success)
        .map(result => result.error || 'Unknown error')
    };
  } catch (error) {
    console.error('Error processing recipe for order:', error);
    return {
      success: false,
      results: [],
      insufficientItems: ['Failed to process recipe ingredients']
    };
  }
};

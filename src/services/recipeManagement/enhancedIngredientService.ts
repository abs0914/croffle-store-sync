
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EnhancedRecipeIngredient {
  id?: string;
  ingredient_name: string;
  recipe_unit: string;
  purchase_unit?: string;
  quantity: number;
  conversion_factor?: number;
  cost_per_unit?: number;
  cost_per_recipe_unit?: number;
  bulk_inventory_item?: string;
  commissary_item_id?: string;
}

export interface BulkInventoryMapping {
  recipe_ingredient_name: string;
  bulk_item_name: string;
  bulk_item_id: string;
  conversion_factor: number;
  recipe_unit: string;
  bulk_unit: string;
}

// Define valid unit types based on the database enum
type ValidUnit = 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs';

// Function to validate and convert unit to valid enum value
const validateUnit = (unit: string): ValidUnit => {
  const validUnits: ValidUnit[] = ['kg', 'g', 'pieces', 'liters', 'ml', 'boxes', 'packs'];
  if (validUnits.includes(unit as ValidUnit)) {
    return unit as ValidUnit;
  }
  // Default to 'pieces' if unit is not recognized
  console.warn(`Invalid unit "${unit}", defaulting to "pieces"`);
  return 'pieces';
};

/**
 * Save enhanced recipe ingredients with conversion factors
 */
export const saveEnhancedRecipeIngredients = async (
  recipeId: string,
  ingredients: EnhancedRecipeIngredient[],
  bulkMappings: BulkInventoryMapping[]
): Promise<boolean> => {
  try {
    // Delete existing ingredients
    await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('recipe_id', recipeId);

    // Insert new ingredients - using existing schema fields with proper typing
    const ingredientData = ingredients.map(ingredient => ({
      recipe_id: recipeId,
      inventory_stock_id: ingredient.commissary_item_id || '', // Required field
      quantity: ingredient.quantity,
      unit: validateUnit(ingredient.recipe_unit), // Ensure valid enum value
      cost_per_unit: ingredient.cost_per_unit || 0,
      commissary_item_id: ingredient.commissary_item_id,
      ingredient_name: ingredient.ingredient_name,
      recipe_unit: ingredient.recipe_unit,
      purchase_unit: ingredient.purchase_unit,
      conversion_factor: ingredient.conversion_factor || 1,
      cost_per_recipe_unit: ingredient.cost_per_recipe_unit || 0
    }));

    const { error: ingredientError } = await supabase
      .from('recipe_ingredients')
      .insert(ingredientData);

    if (ingredientError) throw ingredientError;

    // Save bulk mappings to inventory conversion mappings table
    if (bulkMappings.length > 0) {
      // Delete existing mappings for these ingredients
      await supabase
        .from('inventory_conversion_mappings')
        .delete()
        .in('recipe_ingredient_name', bulkMappings.map(m => m.recipe_ingredient_name));

      // Insert new mappings
      const mappingData = bulkMappings.map(mapping => ({
        inventory_stock_id: mapping.bulk_item_id,
        recipe_ingredient_name: mapping.recipe_ingredient_name,
        recipe_ingredient_unit: mapping.recipe_unit,
        conversion_factor: mapping.conversion_factor,
        notes: `Maps ${mapping.recipe_ingredient_name} to bulk item ${mapping.bulk_item_name}`
      }));

      const { error: mappingError } = await supabase
        .from('inventory_conversion_mappings')
        .insert(mappingData);

      if (mappingError) throw mappingError;
    }

    toast.success('Enhanced recipe ingredients saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving enhanced recipe ingredients:', error);
    toast.error('Failed to save enhanced recipe ingredients');
    return false;
  }
};

/**
 * Save enhanced recipe template ingredients
 */
export const saveEnhancedTemplateIngredients = async (
  templateId: string,
  ingredients: EnhancedRecipeIngredient[]
): Promise<boolean> => {
  try {
    // Delete existing template ingredients
    await supabase
      .from('recipe_template_ingredients')
      .delete()
      .eq('recipe_template_id', templateId);

    // Insert new template ingredients - using existing schema fields
    const ingredientData = ingredients.map(ingredient => ({
      recipe_template_id: templateId,
      ingredient_name: ingredient.ingredient_name,
      quantity: ingredient.quantity,
      unit: ingredient.recipe_unit,
      cost_per_unit: ingredient.cost_per_unit || 0,
      ingredient_category: 'ingredient',
      ingredient_type: 'raw_material',
      commissary_item_id: ingredient.commissary_item_id,
      recipe_unit: ingredient.recipe_unit,
      purchase_unit: ingredient.purchase_unit,
      conversion_factor: ingredient.conversion_factor || 1,
      cost_per_recipe_unit: ingredient.cost_per_recipe_unit || 0
    }));

    const { error: ingredientError } = await supabase
      .from('recipe_template_ingredients')
      .insert(ingredientData);

    if (ingredientError) throw ingredientError;

    toast.success('Enhanced template ingredients saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving enhanced template ingredients:', error);
    toast.error('Failed to save enhanced template ingredients');
    return false;
  }
};

/**
 * Calculate recipe cost with enhanced ingredient breakdown
 */
export const calculateEnhancedRecipeCost = (ingredients: EnhancedRecipeIngredient[]): number => {
  return ingredients.reduce((total, ingredient) => {
    const cost = ingredient.cost_per_recipe_unit || ingredient.cost_per_unit || 0;
    return total + (ingredient.quantity * cost);
  }, 0);
};

/**
 * Get inventory deduction requirements for a recipe
 */
export const getInventoryDeductionRequirements = async (
  recipeId: string,
  quantity: number = 1
): Promise<Array<{ inventory_stock_id: string; item_name: string; deduction_quantity: number; unit: string; }>> => {
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

    const deductionRequirements = [];

    for (const ingredient of ingredients) {
      // Handle the mapping data properly
      let mappingData = ingredient.inventory_conversion_mappings;
      
      // If it's an array, take the first element
      if (Array.isArray(mappingData)) {
        mappingData = mappingData[0];
      }
      
      // Ensure we have a valid mapping object
      if (mappingData && typeof mappingData === 'object' && 'conversion_factor' in mappingData && 'inventory_stock_id' in mappingData) {
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

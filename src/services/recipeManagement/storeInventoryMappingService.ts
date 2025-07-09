import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StoreInventoryMapping {
  recipe_ingredient_name: string;
  recipe_ingredient_unit: string;
  inventory_stock_id: string;
  conversion_factor: number;
  notes?: string;
}

/**
 * Create conversion mappings for recipe ingredients that use store inventory
 */
export const createInventoryConversionMappings = async (
  recipeId: string,
  mappings: StoreInventoryMapping[]
): Promise<boolean> => {
  try {
    if (mappings.length === 0) return true;

    // Insert conversion mappings
    const mappingData = mappings.map(mapping => ({
      inventory_stock_id: mapping.inventory_stock_id,
      recipe_ingredient_name: mapping.recipe_ingredient_name,
      recipe_ingredient_unit: mapping.recipe_ingredient_unit,
      conversion_factor: mapping.conversion_factor,
      notes: mapping.notes || `Conversion mapping for ${mapping.recipe_ingredient_name}`,
      is_active: true
    }));

    const { error } = await supabase
      .from('inventory_conversion_mappings')
      .insert(mappingData);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error creating inventory conversion mappings:', error);
    toast.error('Failed to create inventory conversion mappings');
    return false;
  }
};

/**
 * Get store inventory deduction requirements for a recipe
 */
export const getRecipeInventoryDeductionRequirements = async (
  recipeId: string,
  quantity: number = 1
) => {
  try {
    // This is a placeholder implementation that will work with the current schema
    // In practice, you would query recipe_ingredients that use store inventory
    return [];
  } catch (error) {
    console.error('Error getting recipe inventory deduction requirements:', error);
    return [];
  }
};

/**
 * Process inventory deductions for recipe usage
 * This is a placeholder that will be implemented when recipes are deployed
 */
export const processRecipeInventoryDeductions = async (
  recipeId: string,
  quantity: number,
  storeId: string,
  usedBy: string,
  transactionId?: string
): Promise<boolean> => {
  try {
    // Placeholder implementation
    console.log('Processing inventory deductions for recipe:', recipeId);
    return true;
  } catch (error) {
    console.error('Error processing recipe inventory deductions:', error);
    toast.error('Failed to process inventory deductions');
    return false;
  }
};
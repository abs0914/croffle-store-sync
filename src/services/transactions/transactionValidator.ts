import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TransactionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TransactionItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

/**
 * Validates transaction data before processing
 * Ensures all required data exists and products are properly configured
 */
export const validateTransactionData = async (
  storeId: string,
  items: TransactionItem[]
): Promise<TransactionValidationResult> => {
  const result: TransactionValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  console.log(`🔍 Validating transaction with ${items.length} items for store ${storeId}`);

  // Basic validation
  if (!storeId) {
    result.errors.push('Store ID is required');
    result.isValid = false;
  }

  if (!items || items.length === 0) {
    result.errors.push('At least one item is required');
    result.isValid = false;
  }

  // Validate each item
  for (const item of items) {
    if (!item.productId) {
      result.errors.push(`Item "${item.name}" missing product ID`);
      result.isValid = false;
      continue;
    }

    if (!item.name || item.name.trim() === '') {
      result.errors.push(`Product ${item.productId} missing name`);
      result.isValid = false;
    }

    if (item.quantity <= 0) {
      result.errors.push(`Invalid quantity for ${item.name}: ${item.quantity}`);
      result.isValid = false;
    }

    if (item.unitPrice < 0) {
      result.errors.push(`Invalid price for ${item.name}: ${item.unitPrice}`);
      result.isValid = false;
    }

    // Check if product exists in database
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('id, name, is_active')
        .eq('id', item.productId)
        .eq('store_id', storeId)
        .maybeSingle();

      if (error) {
        console.warn(`Error checking product ${item.productId}:`, error);
        result.warnings.push(`Could not verify product ${item.name} - proceeding anyway`);
      } else if (!product) {
        result.warnings.push(`Product ${item.name} not found in products table - may be direct sale`);
      } else if (!product.is_active) {
        result.errors.push(`Product ${item.name} is inactive and cannot be sold`);
        result.isValid = false;
      }
    } catch (error) {
      console.warn(`Database error checking product ${item.productId}:`, error);
      result.warnings.push(`Could not verify product ${item.name} - database error`);
    }
  }

  // Check for recipe availability (warnings only - don't block transaction)
  try {
    const recipeChecks = await Promise.allSettled(
      items.map(async (item) => {
        const { data: recipe } = await supabase
          .from('recipes')
          .select('id, name')
          .eq('product_id', item.productId)
          .eq('store_id', storeId)
          .eq('is_active', true)
          .maybeSingle();

        return { productName: item.name, hasRecipe: !!recipe };
      })
    );

    recipeChecks.forEach((check, index) => {
      if (check.status === 'fulfilled' && !check.value.hasRecipe) {
        result.warnings.push(`${check.value.productName} has no recipe - inventory won't be deducted`);
      }
    });
  } catch (error) {
    console.warn('Error checking recipes:', error);
    result.warnings.push('Could not verify recipe availability');
  }

  console.log(`✅ Validation completed: ${result.isValid ? 'VALID' : 'INVALID'}, ${result.errors.length} errors, ${result.warnings.length} warnings`);

  return result;
};

/**
 * Validates that transaction items will be properly saved
 */
export const validateTransactionItemsStructure = (items: any[]): boolean => {
  if (!Array.isArray(items)) {
    console.error('❌ Transaction items must be an array');
    return false;
  }

  for (const item of items) {
    if (!item.productId) {
      console.error('❌ Transaction item missing productId:', item);
      return false;
    }
    
    if (!item.name) {
      console.error('❌ Transaction item missing name:', item);
      return false;
    }
    
    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
      console.error('❌ Transaction item invalid quantity:', item);
      return false;
    }
    
    if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
      console.error('❌ Transaction item invalid unitPrice:', item);
      return false;
    }
  }

  return true;
};
import { supabase } from "@/integrations/supabase/client";
import { validateProductForInventory, validateProductsForInventory } from "@/services/inventory/inventoryValidationService";

export interface POSProductValidation {
  productId: string;
  productName: string;
  isValid: boolean;
  canSell: boolean;
  reason?: string;
  hasRecipeTemplate: boolean;
  templateId?: string;
}

/**
 * Validates products for POS system to prevent sync issues
 * Uses the comprehensive inventory sync fix validation
 */
export const validateProductsForPOS = async (
  storeId: string
): Promise<POSProductValidation[]> => {
  try {
    console.log(`🔍 Validating POS products for store: ${storeId}`);
    
    // Get all active products from the store
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        is_active,
        recipe_id,
        recipes!inner (
          id,
          template_id,
          recipe_templates!inner (
            id,
            name,
            is_active
          )
        )
      `)
      .eq('store_id', storeId)
      .eq('is_active', true)
      .eq('recipes.recipe_templates.is_active', true);

    if (error) {
      console.error('Error fetching products for POS validation:', error);
      return [];
    }

    const validationResults: POSProductValidation[] = [];

    // Validate each product using the comprehensive validation system
    for (const product of products || []) {
      const validation = await validateProductForInventory(product.id);
      
      validationResults.push({
        productId: product.id,
        productName: product.name,
        isValid: validation.isValid,
        canSell: validation.canDeductInventory,
        reason: validation.reason,
        hasRecipeTemplate: validation.templateId ? true : false,
        templateId: validation.templateId
      });
    }

    // Log validation summary
    const summary = {
      total: validationResults.length,
      valid: validationResults.filter(p => p.canSell).length,
      invalid: validationResults.filter(p => !p.canSell).length
    };

    console.log(`📊 POS Product Validation Summary:`, summary);

    if (summary.invalid > 0) {
      const invalidProducts = validationResults
        .filter(p => !p.canSell)
        .map(p => `${p.productName} (${p.reason})`)
        .slice(0, 5);
      
      console.warn(`⚠️ ${summary.invalid} products cannot be sold:`, invalidProducts);
    }

    return validationResults;

  } catch (error) {
    console.error('Error in POS product validation:', error);
    return [];
  }
};

/**
 * Get only products that can be safely sold (have valid inventory sync)
 */
export const getValidPOSProducts = async (storeId: string) => {
  const validations = await validateProductsForPOS(storeId);
  
  // Return only products that can be sold
  const validProductIds = validations
    .filter(v => v.canSell)
    .map(v => v.productId);

  if (validProductIds.length === 0) {
    console.warn('⚠️ No valid products found for POS - inventory sync may be required');
    return [];
  }

  // Fetch full product data for valid products only
  const { data: validProducts, error } = await supabase
    .from('products')
    .select(`
      *,
      categories (
        id,
        name,
        description,
        image_url
      ),
      product_variations (
        id,
        name,
        price,
        stock_quantity,
        size,
        is_active
      )
    `)
    .in('id', validProductIds)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching valid POS products:', error);
    return [];
  }

  console.log(`✅ Retrieved ${validProducts?.length || 0} valid products for POS`);
  return validProducts || [];
};

/**
 * Real-time validation for adding items to cart
 */
export const validateCartItem = async (
  productId: string,
  quantity: number = 1
): Promise<{ canAdd: boolean; reason?: string }> => {
  try {
    const validation = await validateProductForInventory(productId);
    
    if (!validation.canDeductInventory) {
      return {
        canAdd: false,
        reason: validation.reason || 'Product cannot be sold - inventory sync required'
      };
    }

    return { canAdd: true };

  } catch (error) {
    console.error('Error validating cart item:', error);
    return {
      canAdd: false,
      reason: 'Validation error - please try again'
    };
  }
};
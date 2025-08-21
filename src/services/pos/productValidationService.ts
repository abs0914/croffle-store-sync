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
 * Enhanced to check ingredient availability before allowing POS display
 */
export const validateProductsForPOS = async (
  storeId: string
): Promise<POSProductValidation[]> => {
  try {
    console.log(`🔍 Validating POS products for store: ${storeId}`);
    
    // Get all active products with their recipe templates and ingredients
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
            is_active,
            recipe_template_ingredients (
              ingredient_name,
              unit,
              quantity
            )
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

    // Enhanced validation with ingredient availability check
    for (const product of products || []) {
      console.log(`🔍 Validating product: ${product.name}`);
      
      const recipe = Array.isArray(product.recipes) ? product.recipes[0] : product.recipes;
      const template = recipe?.recipe_templates;
      const ingredients = template?.recipe_template_ingredients || [];
      
      // Check if all ingredients exist in store inventory
      let canSell = true;
      let reason = '';
      
      if (ingredients.length === 0) {
        canSell = false;
        reason = 'No recipe ingredients defined';
      } else {
        // Check each ingredient exists in store inventory
        for (const ingredient of ingredients) {
          const { data: inventoryItem } = await supabase
            .from('inventory_stock')
            .select('id, stock_quantity, serving_ready_quantity')
            .eq('store_id', storeId)
            .eq('item', ingredient.ingredient_name)
            .eq('is_active', true)
            .maybeSingle();
          
          if (!inventoryItem) {
            canSell = false;
            reason = `Missing ingredient: ${ingredient.ingredient_name}`;
            break;
          }
          
          const availableQty = inventoryItem.serving_ready_quantity || inventoryItem.stock_quantity || 0;
          if (availableQty < ingredient.quantity) {
            canSell = false;
            reason = `Insufficient ${ingredient.ingredient_name}: need ${ingredient.quantity}, have ${availableQty}`;
            break;
          }
        }
      }
      
      validationResults.push({
        productId: product.id,
        productName: product.name,
        isValid: canSell,
        canSell: canSell,
        reason: reason,
        hasRecipeTemplate: template ? true : false,
        templateId: template?.id
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
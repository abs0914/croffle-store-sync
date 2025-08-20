import { supabase } from "@/integrations/supabase/client";

export interface ProductValidationResult {
  isValid: boolean;
  canDeductInventory: boolean;
  status: 'valid' | 'inactive' | 'no_recipe' | 'no_template' | 'inactive_template';
  reason?: string;
  templateId?: string;
}

/**
 * Validates if a product can be used for inventory deduction
 */
export const validateProductForInventory = async (
  productId: string
): Promise<ProductValidationResult> => {
  try {
    // Use the new validation function from the database  
    const { data, error } = await supabase
      .rpc('validate_product_has_recipe_template', { product_id: productId });

    if (error) {
      console.error('Error validating product:', error);
      return {
        isValid: false,
        canDeductInventory: false,
        status: 'no_template',
        reason: `Validation error: ${error.message}`
      };
    }

    // Get detailed product info using direct queries instead of view
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        is_active,
        recipe_id,
        recipes (
          id,
          template_id,
          recipe_templates (
            id,
            name,
            is_active
          )
        )
      `)
      .eq('id', productId)
      .single();

    if (productError || !productData) {
      return {
        isValid: false,
        canDeductInventory: false,
        status: 'no_template',
        reason: 'Product not found'
      };
    }

    const canDeduct = data === true;
    const recipe = Array.isArray(productData.recipes) ? productData.recipes[0] : productData.recipes;
    const hasTemplate = recipe?.recipe_templates?.id ? true : false;
    const templateIsActive = recipe?.recipe_templates?.is_active === true;
    
    let status: ProductValidationResult['status'] = 'valid';
    if (!productData.is_active) status = 'inactive';
    else if (!productData.recipe_id) status = 'no_recipe';
    else if (!hasTemplate) status = 'no_template';
    else if (!templateIsActive) status = 'inactive_template';

    return {
      isValid: canDeduct,
      canDeductInventory: canDeduct,
      status,
      reason: canDeduct ? undefined : `Product status: ${status}`,
      templateId: recipe?.recipe_templates?.id
    };

  } catch (error) {
    console.error('Unexpected error validating product:', error);
    return {
      isValid: false,
      canDeductInventory: false,
      status: 'no_template',
      reason: `Validation failed: ${error}`
    };
  }
};

/**
 * Batch validate multiple products for inventory deduction
 */
export const validateProductsForInventory = async (
  productIds: string[]
): Promise<Map<string, ProductValidationResult>> => {
  const results = new Map<string, ProductValidationResult>();

  try {
    // Get all product data with recipe templates in one query
    const { data: productsData, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        is_active,
        recipe_id,
        recipes (
          id,
          template_id,
          recipe_templates (
            id,
            name,
            is_active
          )
        )
      `)
      .in('id', productIds);

    if (error) {
      console.error('Error batch validating products:', error);
      // Return all as invalid
      productIds.forEach(id => {
        results.set(id, {
          isValid: false,
          canDeductInventory: false,
          status: 'no_template',
          reason: 'Batch validation failed'
        });
      });
      return results;
    }

    // Process each product
    for (const product of productsData || []) {
      const recipe = Array.isArray(product.recipes) ? product.recipes[0] : product.recipes;
      const hasTemplate = recipe?.recipe_templates?.id ? true : false;
      const templateIsActive = recipe?.recipe_templates?.is_active === true;
      const canDeduct = product.is_active && hasTemplate && templateIsActive;
      
      let status: ProductValidationResult['status'] = 'valid';
      if (!product.is_active) status = 'inactive';
      else if (!product.recipe_id) status = 'no_recipe';
      else if (!hasTemplate) status = 'no_template';
      else if (!templateIsActive) status = 'inactive_template';
      
      results.set(product.id, {
        isValid: canDeduct,
        canDeductInventory: canDeduct,
        status,
        reason: canDeduct ? undefined : `Product status: ${status}`,
        templateId: recipe?.recipe_templates?.id
      });
    }

    // Handle any products not found
    productIds.forEach(id => {
      if (!results.has(id)) {
        results.set(id, {
          isValid: false,
          canDeductInventory: false,
          status: 'no_template',
          reason: 'Product not found'
        });
      }
    });

    return results;

  } catch (error) {
    console.error('Unexpected error in batch validation:', error);
    
    // Return all as invalid in case of error
    productIds.forEach(id => {
      results.set(id, {
        isValid: false,
        canDeductInventory: false,
        status: 'no_template',
        reason: `Batch validation error: ${error}`
      });
    });
    
    return results;
  }
};

/**
 * Get comprehensive inventory sync status for debugging
 */
export const getInventorySyncStatus = async (storeId: string) => {
  try {
    // Use direct queries instead of view
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        store_id,
        is_active,
        recipe_id,
        recipes (
          id,
          template_id,
          recipe_templates (
            id,
            name,
            is_active
          )
        )
      `)
      .eq('store_id', storeId)
      .order('name');

    if (error) {
      console.error('Error getting inventory sync status:', error);
      return null;
    }

    // Calculate status for each product
    const productsWithStatus = (data || []).map(product => {
      let status = 'valid';
      let canDeductInventory = true;
      
      if (!product.is_active) {
        status = 'inactive';
        canDeductInventory = false;
      } else if (!product.recipe_id) {
        status = 'no_recipe';
        canDeductInventory = false;
      } else {
        const recipe = Array.isArray(product.recipes) ? product.recipes[0] : product.recipes;
        if (!recipe?.template_id) {
          status = 'no_template';
          canDeductInventory = false;
        } else if (!recipe?.recipe_templates?.is_active) {
          status = 'inactive_template';
          canDeductInventory = false;
        }
      }

      const recipe = Array.isArray(product.recipes) ? product.recipes[0] : product.recipes;
      return {
        ...product,
        status,
        can_deduct_inventory: canDeductInventory,
        template_id: recipe?.recipe_templates?.id,
        template_name: recipe?.recipe_templates?.name
      };
    });

    const summary = {
      total: productsWithStatus.length,
      valid: productsWithStatus.filter(p => p.status === 'valid').length,
      inactive: productsWithStatus.filter(p => p.status === 'inactive').length,
      noRecipe: productsWithStatus.filter(p => p.status === 'no_recipe').length,
      noTemplate: productsWithStatus.filter(p => p.status === 'no_template').length,
      inactiveTemplate: productsWithStatus.filter(p => p.status === 'inactive_template').length
    };

    console.log(`📊 Inventory Sync Status for Store ${storeId}:`, summary);

    return {
      products: productsWithStatus,
      summary
    };

  } catch (error) {
    console.error('Error getting inventory sync status:', error);
    return null;
  }
};
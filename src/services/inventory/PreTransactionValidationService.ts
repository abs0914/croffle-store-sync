import { supabase } from "@/integrations/supabase/client";

/**
 * Pre-Transaction Validation Service
 * 
 * Validates products before allowing transactions to prevent inventory deduction failures
 */

export interface ValidationResult {
  canProceed: boolean;
  blockedProducts: Array<{
    productId?: string;
    productName: string;
    issues: string[];
  }>;
  warnings: string[];
}

export interface ValidationItem {
  productId?: string;
  productName: string;
  quantity: number;
}

/**
 * Validate products before transaction processing
 */
export const validateProductsBeforeTransaction = async (
  storeId: string,
  items: ValidationItem[]
): Promise<ValidationResult> => {
  console.log(`🔍 Pre-validating ${items.length} products for store ${storeId}`);
  
  const result: ValidationResult = {
    canProceed: true,
    blockedProducts: [],
    warnings: []
  };

  try {
    // Batch fetch product configurations
    const productIds = items.filter(item => item.productId).map(item => item.productId!);
    const productNames = items.map(item => item.productName);

    const [catalogResult, templatesResult] = await Promise.all([
      // Fetch product catalog entries with recipe relationships
      supabase
        .from('product_catalog')
        .select(`
          id,
          product_name,
          recipe_id,
          is_available,
          recipes (
            id,
            name,
            is_active,
            recipe_ingredients (
              id,
              ingredient_name,
              inventory_stock_id
            )
          )
        `)
        .eq('store_id', storeId)
        .eq('is_available', true),
      
      // Fetch recipe templates as fallback
      supabase
        .from('recipe_templates')
        .select(`
          id,
          name,
          is_active,
          recipe_template_ingredients (
            id,
            ingredient_name
          )
        `)
        .in('name', productNames)
        .eq('is_active', true)
    ]);

    if (catalogResult.error) {
      console.error('❌ Error fetching product catalog:', catalogResult.error);
      result.warnings.push(`Error fetching product catalog: ${catalogResult.error.message}`);
    }

    if (templatesResult.error) {
      console.error('❌ Error fetching templates:', templatesResult.error);
      result.warnings.push(`Error fetching templates: ${templatesResult.error.message}`);
    }

    const catalogProducts = catalogResult.data || [];
    const recipeTemplates = templatesResult.data || [];

    // Validate each item
    for (const item of items) {
      const productIssues: string[] = [];
      
      // Find product in catalog
      let catalogProduct = catalogProducts.find(p => p.id === item.productId);
      
      // If not found by ID, try by name
      if (!catalogProduct) {
        catalogProduct = catalogProducts.find(p => 
          p.product_name.toLowerCase().trim() === item.productName.toLowerCase().trim()
        );
      }

      // Check if product exists in catalog
      if (!catalogProduct) {
        // Check if recipe template exists as fallback
        const template = recipeTemplates.find(t => 
          t.name.toLowerCase().trim() === item.productName.toLowerCase().trim()
        );
        
        if (!template) {
          productIssues.push('Product not found in catalog and no recipe template available');
        } else if (!template.is_active) {
          productIssues.push('Recipe template exists but is inactive');
        } else if (!template.recipe_template_ingredients || template.recipe_template_ingredients.length === 0) {
          productIssues.push('Recipe template has no ingredients defined');
        } else {
          // Template fallback available - add warning but allow transaction
          result.warnings.push(`${item.productName} will use template fallback (no catalog entry)`);
        }
        
        if (productIssues.length > 0) {
          result.blockedProducts.push({
            productId: item.productId,
            productName: item.productName,
            issues: productIssues
          });
          continue;
        }
      } else {
        // Product found in catalog - validate recipe configuration
        if (!catalogProduct.recipe_id) {
          // Check if template fallback is available
          const template = recipeTemplates.find(t => 
            t.name.toLowerCase().trim() === catalogProduct!.product_name.toLowerCase().trim()
          );
          
          if (!template) {
            productIssues.push('Product has no recipe linked and no template fallback available');
          } else {
            result.warnings.push(`${item.productName} missing recipe link - will use template fallback`);
          }
        } else {
          // Recipe exists - validate it
          const recipe = catalogProduct.recipes;
          
          if (!recipe || !recipe.is_active) {
            productIssues.push('Product recipe is inactive or missing');
          } else if (!recipe.recipe_ingredients || recipe.recipe_ingredients.length === 0) {
            productIssues.push('Product recipe has no ingredients defined');
          } else {
            // Check if ingredients are mapped to inventory
            const unmappedIngredients = recipe.recipe_ingredients.filter(ing => !ing.inventory_stock_id);
            if (unmappedIngredients.length > 0) {
              productIssues.push(`Recipe has ${unmappedIngredients.length} ingredients not mapped to inventory`);
            }
          }
        }
      }

      // If any critical issues found, block the product
      if (productIssues.length > 0) {
        result.blockedProducts.push({
          productId: item.productId,
          productName: item.productName,
          issues: productIssues
        });
      }
    }

    // Determine if transaction can proceed
    result.canProceed = result.blockedProducts.length === 0;
    
    console.log(`✅ Pre-validation complete: ${result.canProceed ? 'CAN PROCEED' : 'BLOCKED'}`);
    console.log(`📊 Results: ${result.blockedProducts.length} blocked, ${result.warnings.length} warnings`);
    
    return result;

  } catch (error) {
    console.error('❌ Pre-validation error:', error);
    result.canProceed = false;
    result.warnings.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
};

/**
 * Check if a specific product is ready for transactions
 */
export const isProductReadyForTransaction = async (
  storeId: string,
  productId: string,
  productName: string
): Promise<{ ready: boolean; issues: string[]; warnings: string[]; }> => {
  const validation = await validateProductsBeforeTransaction(storeId, [
    { productId, productName, quantity: 1 }
  ]);
  
  const blockedProduct = validation.blockedProducts.find(p => p.productId === productId || p.productName === productName);
  
  return {
    ready: !blockedProduct,
    issues: blockedProduct?.issues || [],
    warnings: validation.warnings
  };
};
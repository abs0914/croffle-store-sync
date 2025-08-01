import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProductValidationResult {
  isValid: boolean;
  productName: string;
  missingIngredients: boolean;
  lowStockIngredients: string[];
  errors: string[];
}

export const validateProductForSale = async (
  productId: string,
  quantity: number = 1
): Promise<ProductValidationResult> => {
  try {
    console.log('🔍 Validating product for sale:', { productId, quantity });

    // Get product details
    const { data: productInfo, error: productInfoError } = await supabase
      .from('product_catalog')
      .select('product_name, recipe_id, is_available')
      .eq('id', productId)
      .single();

    if (productInfoError || !productInfo) {
      return {
        isValid: false,
        productName: 'Unknown Product',
        missingIngredients: true,
        lowStockIngredients: [],
        errors: ['Product not found']
      };
    }

    const result: ProductValidationResult = {
      isValid: true,
      productName: productInfo.product_name,
      missingIngredients: false,
      lowStockIngredients: [],
      errors: []
    };

    // Check if product is available
    if (!productInfo.is_available) {
      result.isValid = false;
      result.errors.push('Product is not available for sale');
    }

    // Get product ingredients (primary path)
    const { data: productIngredients, error: productError } = await supabase
      .from('product_ingredients')
      .select(`
        *,
        inventory_item:inventory_stock(*)
      `)
      .eq('product_catalog_id', productId);

    if (productError) throw productError;

    let ingredients = productIngredients || [];

    // If no product ingredients found, check recipe ingredients (fallback path)
    if (ingredients.length === 0 && productInfo.recipe_id) {
      console.log('Checking recipe ingredients for validation...');
      
      const { data: recipeIngredients, error: recipeError } = await supabase
        .from('recipe_ingredients')
        .select(`
          *,
          inventory_item:inventory_stock(*)
        `)
        .eq('recipe_id', productInfo.recipe_id);

      if (recipeError) throw recipeError;

      // Map recipe ingredients to product ingredient format
      ingredients = recipeIngredients?.map(ri => ({
        ...ri,
        product_catalog_id: productId,
        required_quantity: ri.quantity,
        inventory_stock_id: ri.inventory_stock_id
      })) || [];
    }

    // Check if ingredients are configured
    if (ingredients.length === 0) {
      result.isValid = false;
      result.missingIngredients = true;
      result.errors.push('No ingredients configured for this product');
    }

    // Check ingredient stock levels
    for (const ingredient of ingredients) {
      const deductionAmount = ingredient.required_quantity * quantity;
      const currentStock = ingredient.inventory_item?.stock_quantity || 0;
      const ingredientName = ingredient.inventory_item?.item || 'Unknown ingredient';

      if (currentStock < deductionAmount) {
        result.isValid = false;
        result.lowStockIngredients.push(
          `${ingredientName} (need ${deductionAmount}, have ${currentStock})`
        );
      }
    }

    console.log('✅ Product validation result:', result);
    return result;

  } catch (error) {
    console.error('❌ Error validating product:', error);
    return {
      isValid: false,
      productName: 'Unknown Product',
      missingIngredients: true,
      lowStockIngredients: [],
      errors: ['Validation failed due to system error']
    };
  }
};

export const validateStoreProducts = async (storeId: string): Promise<{
  totalProducts: number;
  productsWithoutIngredients: any[];
  productsWithLowStock: any[];
}> => {
  try {
    console.log('🏪 Validating all products for store:', storeId);

    // Get all products for the store
    const { data: products, error: productsError } = await supabase
      .from('product_catalog')
      .select('id, product_name, is_available, recipe_id')
      .eq('store_id', storeId)
      .eq('is_available', true);

    if (productsError) throw productsError;

    const productsWithoutIngredients: any[] = [];
    const productsWithLowStock: any[] = [];

    for (const product of products || []) {
      const validation = await validateProductForSale(product.id);
      
      if (validation.missingIngredients) {
        productsWithoutIngredients.push({
          ...product,
          issues: validation.errors
        });
      }
      
      if (validation.lowStockIngredients.length > 0) {
        productsWithLowStock.push({
          ...product,
          lowStockItems: validation.lowStockIngredients
        });
      }
    }

    const summary = {
      totalProducts: products?.length || 0,
      productsWithoutIngredients,
      productsWithLowStock
    };

    console.log('📊 Store validation summary:', summary);
    
    if (productsWithoutIngredients.length > 0) {
      toast.warning(`${productsWithoutIngredients.length} products missing ingredient configuration`);
    }
    
    if (productsWithLowStock.length > 0) {
      toast.warning(`${productsWithLowStock.length} products have insufficient ingredient stock`);
    }

    return summary;

  } catch (error) {
    console.error('❌ Error validating store products:', error);
    toast.error('Failed to validate store products');
    return {
      totalProducts: 0,
      productsWithoutIngredients: [],
      productsWithLowStock: []
    };
  }
};
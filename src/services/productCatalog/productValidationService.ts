import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InventoryCacheService } from "@/services/cache/inventoryCacheService";

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

    // Check if this is a combo product (has "combo-" prefix)
    if (productId.startsWith('combo-')) {
      return await validateComboProduct(productId, quantity);
    }

    // Get product details for regular products
    const { data: productInfo, error: productInfoError } = await supabase
      .from('product_catalog')
      .select('product_name, recipe_id, is_available')
      .eq('id', productId)
      .maybeSingle();

    if (productInfoError || !productInfo) {
      // Try to find similar products for debugging
      const { data: similarProducts } = await supabase
        .from('product_catalog')
        .select('id, product_name')
        .ilike('product_name', '%croffle%')
        .limit(10);
      
      console.error('🔍 Product validation failed for ID:', productId);
      console.error('🔍 Available croffle products:', similarProducts);
      
      return {
        isValid: false,
        productName: 'Unknown Product',
        missingIngredients: true,
        lowStockIngredients: [],
        errors: [`Product not found: ${productId}. Available products: ${similarProducts?.map(p => p.product_name).join(', ') || 'none'}`]
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
        inventory_item:inventory_stock!product_ingredients_inventory_stock_id_fkey(*)
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
          inventory_item:inventory_stock!recipe_ingredients_inventory_stock_id_fkey(*)
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

      if (currentStock <= 0) {
        // Only block if ingredient is completely out of stock
        result.isValid = false;
        result.errors.push(`${ingredientName} is out of stock`);
      } else if (currentStock < deductionAmount) {
        // Allow sale but warn about low stock
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

/**
 * Validates combo products by checking their individual components
 */
const validateComboProduct = async (
  comboProductId: string,
  quantity: number = 1
): Promise<ProductValidationResult> => {
  try {
    console.log('🔍 Validating combo product:', comboProductId);
    
    // Extract component product IDs from combo ID
    // Format: combo-{product1-id}-{product2-id}
    const parts = comboProductId.split('-');
    if (parts.length < 3) {
      return {
        isValid: false,
        productName: 'Invalid Combo Product',
        missingIngredients: true,
        lowStockIngredients: [],
        errors: ['Invalid combo product format']
      };
    }

    // Extract the component product IDs (everything after "combo-")
    const componentIds: string[] = [];
    let currentId = '';
    
    for (let i = 1; i < parts.length; i++) {
      if (currentId) {
        currentId += '-' + parts[i];
      } else {
        currentId = parts[i];
      }
      
      // Check if this looks like a complete UUID (36 characters with dashes)
      if (currentId.length === 36 && currentId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        componentIds.push(currentId);
        currentId = '';
      }
    }

    if (componentIds.length === 0) {
      return {
        isValid: false,
        productName: 'Invalid Combo Product',
        missingIngredients: true,
        lowStockIngredients: [],
        errors: ['Could not parse combo product components']
      };
    }

    console.log('🧩 Found combo components:', componentIds);

    // Get component product names for display
    const { data: componentProducts } = await supabase
      .from('product_catalog')
      .select('id, product_name')
      .in('id', componentIds);

    const comboName = componentProducts
      ?.map(p => p.product_name)
      ?.join(' + ') || 'Combo Product';

    // Validate each component
    const result: ProductValidationResult = {
      isValid: true,
      productName: comboName,
      missingIngredients: false,
      lowStockIngredients: [],
      errors: []
    };

    for (const componentId of componentIds) {
      const componentValidation = await validateProductForSale(componentId, quantity);
      
      if (!componentValidation.isValid) {
        result.isValid = false;
        result.errors.push(...componentValidation.errors);
      }
      
      if (componentValidation.missingIngredients) {
        result.missingIngredients = true;
      }
      
      result.lowStockIngredients.push(...componentValidation.lowStockIngredients);
    }

    console.log('✅ Combo product validation result:', result);
    return result;

  } catch (error) {
    console.error('❌ Error validating combo product:', error);
    return {
      isValid: false,
      productName: 'Combo Product Error',
      missingIngredients: true,
      lowStockIngredients: [],
      errors: ['Failed to validate combo product']
    };
  }
}

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
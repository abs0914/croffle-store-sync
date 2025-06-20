
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface POSInventoryUpdate {
  productId: string;
  variationId?: string;
  quantitySold: number;
  transactionId: string;
  storeId: string;
}

export interface InventoryCheckResult {
  isAvailable: boolean;
  availableQuantity: number;
  productName: string;
  currentStock: number;
}

/**
 * Check if a product has sufficient inventory for POS sale
 */
export const checkProductInventoryAvailability = async (
  productId: string,
  quantityRequested: number,
  storeId: string,
  variationId?: string
): Promise<InventoryCheckResult> => {
  try {
    // First check if it's a product from product_catalog (with recipes)
    const { data: catalogProduct } = await supabase
      .from('product_catalog')
      .select('*')
      .eq('id', productId)
      .eq('store_id', storeId)
      .single();

    if (catalogProduct) {
      // For catalog products, check recipe ingredients
      return await checkRecipeInventoryAvailability(productId, quantityRequested, storeId);
    }

    // For regular products, check direct inventory
    const { data: product } = await supabase
      .from('products')
      .select('name, stock_quantity')
      .eq('id', productId)
      .eq('store_id', storeId)
      .single();

    if (!product) {
      return {
        isAvailable: false,
        availableQuantity: 0,
        productName: 'Unknown Product',
        currentStock: 0
      };
    }

    return {
      isAvailable: product.stock_quantity >= quantityRequested,
      availableQuantity: product.stock_quantity,
      productName: product.name,
      currentStock: product.stock_quantity
    };

  } catch (error) {
    console.error('Error checking product inventory:', error);
    return {
      isAvailable: false,
      availableQuantity: 0,
      productName: 'Error',
      currentStock: 0
    };
  }
};

/**
 * Check recipe ingredient availability for catalog products
 */
const checkRecipeInventoryAvailability = async (
  productId: string,
  quantityRequested: number,
  storeId: string
): Promise<InventoryCheckResult> => {
  try {
    const { data: productWithIngredients } = await supabase
      .from('product_catalog')
      .select(`
        product_name,
        recipe_id,
        ingredients:product_ingredients(
          required_quantity,
          unit,
          inventory_item:inventory_stock!inner(
            item,
            stock_quantity,
            store_id
          )
        )
      `)
      .eq('id', productId)
      .eq('ingredients.inventory_item.store_id', storeId)
      .single();

    if (!productWithIngredients?.ingredients) {
      return {
        isAvailable: false,
        availableQuantity: 0,
        productName: productWithIngredients?.product_name || 'Unknown',
        currentStock: 0
      };
    }

    let maxPossibleQuantity = Infinity;
    
    for (const ingredient of productWithIngredients.ingredients) {
      const requiredPerUnit = ingredient.required_quantity;
      const availableStock = ingredient.inventory_item.stock_quantity;
      
      const possibleQuantity = Math.floor(availableStock / requiredPerUnit);
      maxPossibleQuantity = Math.min(maxPossibleQuantity, possibleQuantity);
    }

    const finalMaxQuantity = maxPossibleQuantity === Infinity ? 0 : maxPossibleQuantity;

    return {
      isAvailable: finalMaxQuantity >= quantityRequested,
      availableQuantity: finalMaxQuantity,
      productName: productWithIngredients.product_name,
      currentStock: finalMaxQuantity
    };

  } catch (error) {
    console.error('Error checking recipe inventory:', error);
    return {
      isAvailable: false,
      availableQuantity: 0,
      productName: 'Error',
      currentStock: 0
    };
  }
};

/**
 * Process inventory deduction when POS sale is completed
 */
export const processInventoryDeduction = async (
  updates: POSInventoryUpdate[]
): Promise<{ success: boolean; errors: string[] }> => {
  const errors: string[] = [];
  
  try {
    for (const update of updates) {
      // Check if it's a catalog product with recipe
      const { data: catalogProduct } = await supabase
        .from('product_catalog')
        .select('*, recipe_id')
        .eq('id', update.productId)
        .eq('store_id', update.storeId)
        .single();

      if (catalogProduct && catalogProduct.recipe_id) {
        // Process recipe ingredient deductions
        const success = await deductRecipeIngredients(
          update.productId,
          update.quantitySold,
          update.transactionId,
          update.storeId
        );
        
        if (!success) {
          errors.push(`Failed to deduct ingredients for ${catalogProduct.product_name}`);
        }
      } else {
        // Process regular product stock deduction
        const success = await deductRegularProductStock(
          update.productId,
          update.quantitySold,
          update.transactionId,
          update.storeId,
          update.variationId
        );
        
        if (!success) {
          errors.push(`Failed to deduct stock for product ${update.productId}`);
        }
      }
    }

    return { success: errors.length === 0, errors };

  } catch (error) {
    console.error('Error processing inventory deductions:', error);
    return { success: false, errors: [`System error: ${error instanceof Error ? error.message : 'Unknown error'}`] };
  }
};

/**
 * Deduct ingredients for recipe-based products
 */
const deductRecipeIngredients = async (
  productId: string,
  quantitySold: number,
  transactionId: string,
  storeId: string
): Promise<boolean> => {
  try {
    // Get recipe ingredients
    const { data: ingredients } = await supabase
      .from('product_ingredients')
      .select(`
        required_quantity,
        unit,
        inventory_stock_id,
        inventory_item:inventory_stock!inner(
          item,
          stock_quantity,
          store_id
        )
      `)
      .eq('product_catalog_id', productId)
      .eq('inventory_item.store_id', storeId);

    if (!ingredients) return false;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Deduct each ingredient
    for (const ingredient of ingredients) {
      const quantityToDeduct = ingredient.required_quantity * quantitySold;
      const currentStock = ingredient.inventory_item.stock_quantity;
      const newStock = currentStock - quantityToDeduct;

      // Update inventory stock
      const { error: updateError } = await supabase
        .from('inventory_stock')
        .update({ stock_quantity: Math.max(0, newStock) })
        .eq('id', ingredient.inventory_stock_id);

      if (updateError) {
        console.error('Error updating inventory stock:', updateError);
        return false;
      }

      // Log inventory movement
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          inventory_stock_id: ingredient.inventory_stock_id,
          movement_type: 'sale',
          quantity_change: -quantityToDeduct,
          previous_quantity: currentStock,
          new_quantity: Math.max(0, newStock),
          created_by: userId,
          reference_type: 'transaction',
          reference_id: transactionId,
          notes: `POS Sale - Recipe ingredient deduction`
        });

      if (movementError) {
        console.warn('Error logging inventory movement:', movementError);
      }
    }

    return true;
  } catch (error) {
    console.error('Error deducting recipe ingredients:', error);
    return false;
  }
};

/**
 * Deduct stock for regular products
 */
const deductRegularProductStock = async (
  productId: string,
  quantitySold: number,
  transactionId: string,
  storeId: string,
  variationId?: string
): Promise<boolean> => {
  try {
    if (variationId) {
      // Update product variation stock
      const { data: variation, error: fetchError } = await supabase
        .from('product_variations')
        .select('stock_quantity')
        .eq('id', variationId)
        .single();

      if (fetchError) return false;

      const newStock = Math.max(0, variation.stock_quantity - quantitySold);
      
      const { error: updateError } = await supabase
        .from('product_variations')
        .update({ stock_quantity: newStock })
        .eq('id', variationId);

      return !updateError;
    } else {
      // Update product stock
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', productId)
        .eq('store_id', storeId)
        .single();

      if (fetchError) return false;

      const newStock = Math.max(0, product.stock_quantity - quantitySold);
      
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', productId);

      return !updateError;
    }
  } catch (error) {
    console.error('Error deducting regular product stock:', error);
    return false;
  }
};

/**
 * Get inventory status for POS dashboard
 */
export const getPOSInventoryStatus = async (storeId: string) => {
  try {
    const { data: inventory } = await supabase
      .from('inventory_stock')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true);

    const totalItems = inventory?.length || 0;
    const lowStockItems = inventory?.filter(item => 
      item.stock_quantity <= (item.minimum_threshold || 10)
    ).length || 0;
    const outOfStockItems = inventory?.filter(item => 
      item.stock_quantity <= 0
    ).length || 0;

    return {
      totalItems,
      lowStockItems,
      outOfStockItems,
      healthyItems: totalItems - lowStockItems - outOfStockItems
    };
  } catch (error) {
    console.error('Error getting POS inventory status:', error);
    return {
      totalItems: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      healthyItems: 0
    };
  }
};

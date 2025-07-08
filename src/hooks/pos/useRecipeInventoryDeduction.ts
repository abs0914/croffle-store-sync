
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useUnifiedInventoryDeduction, ProductSaleItem } from "@/hooks/inventory/useUnifiedInventoryDeduction";
import { useAuth } from "@/contexts/auth";

export interface ProductWithRecipe {
  id: string;
  name: string;
  recipe_id?: string;
  quantity_sold: number;
}

/**
 * @deprecated Use useUnifiedInventoryDeduction instead
 * This hook is kept for backward compatibility
 */
export function useRecipeInventoryDeduction(storeId: string) {
  const { user } = useAuth();
  const {
    processProductSales,
    checkProductAvailability: unifiedCheckProductAvailability,
    isProcessing,
    lastResult
  } = useUnifiedInventoryDeduction(storeId);

  /**
   * Process inventory deduction for products with recipes
   * Call this when completing a POS transaction
   */
  const processRecipeDeductions = useCallback(async (
    products: ProductWithRecipe[],
    transactionId?: string
  ): Promise<{
    success: boolean;
    results: any[];
    errors: string[];
  }> => {
    console.warn('useRecipeInventoryDeduction is deprecated, use useUnifiedInventoryDeduction instead');

    if (!user?.id) {
      toast.error("User not authenticated");
      return { success: false, results: [], errors: ["User not authenticated"] };
    }

    // Convert ProductWithRecipe to ProductSaleItem
    const productSaleItems: ProductSaleItem[] = products.map(product => ({
      productId: product.id,
      quantity: product.quantity_sold,
      recipeId: product.recipe_id
    }));

    return await processProductSales(productSaleItems, transactionId);
  }, [processProductSales, user?.id]);

  /**
   * Check if products with recipes can be made with current inventory
   */
  const checkRecipeProductAvailability = useCallback(async (
    products: ProductWithRecipe[]
  ): Promise<{
    available: boolean;
    unavailableProducts: {
      product: ProductWithRecipe;
      reason: string;
      maxQuantity: number;
    }[];
  }> => {
    // Convert ProductWithRecipe to ProductSaleItem
    const productSaleItems: ProductSaleItem[] = products.map(product => ({
      productId: product.id,
      quantity: product.quantity_sold,
      recipeId: product.recipe_id
    }));

    const result = await unifiedCheckProductAvailability(productSaleItems);
    
    // Convert back to ProductWithRecipe format
    return {
      available: result.available,
      unavailableProducts: result.unavailableProducts.map(item => ({
        product: products.find(p => p.id === item.product.productId) || {
          id: item.product.productId,
          name: 'Unknown Product',
          recipe_id: item.product.recipeId,
          quantity_sold: item.product.quantity
        },
        reason: item.reason,
        maxQuantity: item.maxQuantity
      }))
    };
  }, [unifiedCheckProductAvailability]);

  /**
   * Get a preview of what inventory will be deducted
   */
  const getDeductionPreview = useCallback(async (
    products: ProductWithRecipe[]
  ): Promise<{
    preview: {
      product_name: string;
      recipe_name: string;
      ingredients: {
        item_name: string;
        quantity_needed: number;
        current_stock: number;
        remaining_after: number;
        unit: string;
      }[];
    }[];
    warnings: string[];
  }> => {
    // This is a placeholder - actual implementation would require more complex logic
    const preview: any[] = [];
    const warnings: string[] = [];

    return { preview, warnings };
  }, [storeId]);

  return {
    processRecipeDeductions,
    checkProductAvailability: checkRecipeProductAvailability,
    getDeductionPreview,
    isProcessing,
    lastDeductionResult: lastResult
  };
}

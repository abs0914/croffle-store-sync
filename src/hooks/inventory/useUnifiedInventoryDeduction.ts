
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  processInventoryDeduction,
  processRecipeInventoryDeduction,
  checkRecipeAvailability,
  InventoryDeductionRequest,
  InventoryDeductionResult,
  InventoryDeductionItem
} from '@/services/inventory/unifiedInventoryDeductionService';
import { useAuth } from '@/contexts/auth';

export interface ProductSaleItem {
  productId: string;
  variationId?: string;
  quantity: number;
  recipeId?: string;
}

export function useUnifiedInventoryDeduction(storeId: string) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<InventoryDeductionResult | null>(null);

  /**
   * Process direct inventory deduction (for products without recipes)
   */
  const processDirectDeduction = useCallback(async (
    items: InventoryDeductionItem[],
    transactionId?: string,
    notes?: string
  ): Promise<InventoryDeductionResult> => {
    if (!user?.id) {
      toast.error("User not authenticated");
      return { success: false, deductions: [], errors: ["User not authenticated"], insufficient_items: [] };
    }

    setIsProcessing(true);
    try {
      const request: InventoryDeductionRequest = {
        store_id: storeId,
        items,
        transaction_id: transactionId,
        transaction_type: 'sale',
        user_id: user.id,
        notes
      };

      const result = await processInventoryDeduction(request);
      setLastResult(result);

      if (result.success) {
        toast.success('Inventory updated successfully');
      } else {
        toast.error(`Inventory update failed: ${result.errors.join(', ')}`);
      }

      return result;
    } catch (error) {
      console.error('Error in processDirectDeduction:', error);
      const errorResult = {
        success: false,
        deductions: [],
        errors: [`System error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        insufficient_items: []
      };
      setLastResult(errorResult);
      return errorResult;
    } finally {
      setIsProcessing(false);
    }
  }, [storeId, user?.id]);

  /**
   * Process recipe-based inventory deduction
   */
  const processRecipeDeduction = useCallback(async (
    recipeId: string,
    quantity: number,
    transactionId?: string,
    notes?: string
  ): Promise<InventoryDeductionResult> => {
    if (!user?.id) {
      toast.error("User not authenticated");
      return { success: false, deductions: [], errors: ["User not authenticated"], insufficient_items: [] };
    }

    setIsProcessing(true);
    try {
      const result = await processRecipeInventoryDeduction(
        recipeId,
        quantity,
        storeId,
        user.id,
        transactionId,
        notes
      );
      setLastResult(result);

      if (result.success) {
        toast.success('Recipe inventory updated successfully');
      } else {
        toast.error(`Recipe inventory update failed: ${result.errors.join(', ')}`);
      }

      return result;
    } catch (error) {
      console.error('Error in processRecipeDeduction:', error);
      const errorResult = {
        success: false,
        deductions: [],
        errors: [`System error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        insufficient_items: []
      };
      setLastResult(errorResult);
      return errorResult;
    } finally {
      setIsProcessing(false);
    }
  }, [storeId, user?.id]);

  /**
   * Process multiple product sales (mix of direct and recipe-based)
   */
  const processProductSales = useCallback(async (
    products: ProductSaleItem[],
    transactionId?: string
  ): Promise<{
    success: boolean;
    results: InventoryDeductionResult[];
    errors: string[];
  }> => {
    if (!user?.id) {
      toast.error("User not authenticated");
      return { success: false, results: [], errors: ["User not authenticated"] };
    }

    setIsProcessing(true);
    const results: InventoryDeductionResult[] = [];
    const errors: string[] = [];

    try {
      for (const product of products) {
        try {
          let result: InventoryDeductionResult;

          if (product.recipeId) {
            // Recipe-based product
            result = await processRecipeInventoryDeduction(
              product.recipeId,
              product.quantity,
              storeId,
              user.id,
              transactionId,
              `Product sale: ${product.quantity} units`
            );
          } else {
            // Direct inventory product - would need product catalog integration
            // For now, skip products without recipes
            continue;
          }

          results.push(result);
          
          if (!result.success) {
            errors.push(...result.errors);
          }

        } catch (error) {
          const errorMsg = `Error processing product ${product.productId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg, error);
        }
      }

      const overallSuccess = errors.length === 0;
      
      if (overallSuccess) {
        toast.success('All product inventory updated successfully');
      } else {
        toast.error(`Some products failed to update: ${errors.join(', ')}`);
      }

      return {
        success: overallSuccess,
        results,
        errors
      };

    } catch (error) {
      const errorMsg = `System error during product sales processing: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error('Error in processProductSales:', error);
      toast.error("Failed to process product sales");
      
      return { success: false, results, errors };
    } finally {
      setIsProcessing(false);
    }
  }, [storeId, user?.id]);

  /**
   * Check if products can be made with current inventory
   */
  const checkProductAvailability = useCallback(async (
    products: ProductSaleItem[]
  ): Promise<{
    available: boolean;
    unavailableProducts: {
      product: ProductSaleItem;
      reason: string;
      maxQuantity: number;
    }[];
  }> => {
    const unavailableProducts: {
      product: ProductSaleItem;
      reason: string;
      maxQuantity: number;
    }[] = [];

    try {
      for (const product of products) {
        if (!product.recipeId) continue;

        const availability = await checkRecipeAvailability(
          product.recipeId,
          product.quantity,
          storeId
        );

        if (!availability.canMake) {
          unavailableProducts.push({
            product,
            reason: availability.missingIngredients.length > 0 
              ? `Missing ingredients: ${availability.missingIngredients.join(', ')}`
              : `Insufficient stock (max: ${availability.maxQuantity})`,
            maxQuantity: availability.maxQuantity
          });
        }
      }

      return {
        available: unavailableProducts.length === 0,
        unavailableProducts
      };

    } catch (error) {
      console.error('Error checking product availability:', error);
      toast.error("Failed to check product availability");
      return {
        available: false,
        unavailableProducts: products
          .filter(p => p.recipeId)
          .map(product => ({
            product,
            reason: "System error checking availability",
            maxQuantity: 0
          }))
      };
    }
  }, [storeId]);

  return {
    processDirectDeduction,
    processRecipeDeduction,
    processProductSales,
    checkProductAvailability,
    isProcessing,
    lastResult
  };
}

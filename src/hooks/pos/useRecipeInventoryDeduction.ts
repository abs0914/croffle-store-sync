import { useState, useCallback } from "react";
import { toast } from "sonner";
import { 
  deductInventoryForRecipe, 
  checkRecipeAvailability,
  RecipeUsageData,
  InventoryDeductionResult
} from "@/services/pos/recipeInventoryService";
import { useAuth } from "@/contexts/auth";

export interface ProductWithRecipe {
  id: string;
  name: string;
  recipe_id?: string;
  quantity_sold: number;
}

export function useRecipeInventoryDeduction(storeId: string) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastDeductionResult, setLastDeductionResult] = useState<InventoryDeductionResult | null>(null);

  /**
   * Process inventory deduction for products with recipes
   * Call this when completing a POS transaction
   */
  const processRecipeDeductions = useCallback(async (
    products: ProductWithRecipe[],
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
      // Filter products that have recipes
      const productsWithRecipes = products.filter(p => p.recipe_id);
      
      if (productsWithRecipes.length === 0) {
        setIsProcessing(false);
        return { success: true, results: [], errors: [] };
      }

      // Process each product with a recipe
      for (const product of productsWithRecipes) {
        if (!product.recipe_id) continue;

        const recipeUsage: RecipeUsageData = {
          recipe_id: product.recipe_id,
          quantity_used: product.quantity_sold,
          transaction_id: transactionId,
          notes: `POS Sale: ${product.name} (${product.quantity_sold} units)`
        };

        try {
          const result = await deductInventoryForRecipe(recipeUsage, storeId, user.id);
          results.push(result);

          if (!result.success) {
            errors.push(`Failed to deduct inventory for ${product.name}: ${result.errors.join(', ')}`);
            toast.error(`Inventory deduction failed for ${product.name}`);
          } else {
            toast.success(`Inventory updated for ${product.name} recipe`);
          }
        } catch (error) {
          const errorMsg = `Error processing recipe for ${product.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg, error);
        }
      }

      const overallSuccess = errors.length === 0;
      setLastDeductionResult(results[0] || null);

      return {
        success: overallSuccess,
        results,
        errors
      };

    } catch (error) {
      const errorMsg = `System error during recipe processing: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error('Error in processRecipeDeductions:', error);
      toast.error("Failed to process recipe inventory deductions");
      
      return { success: false, results, errors };
    } finally {
      setIsProcessing(false);
    }
  }, [storeId, user?.id]);

  /**
   * Check if products with recipes can be made with current inventory
   */
  const checkProductAvailability = useCallback(async (
    products: ProductWithRecipe[]
  ): Promise<{
    available: boolean;
    unavailableProducts: {
      product: ProductWithRecipe;
      reason: string;
      maxQuantity: number;
    }[];
  }> => {
    const unavailableProducts: {
      product: ProductWithRecipe;
      reason: string;
      maxQuantity: number;
    }[] = [];

    try {
      for (const product of products) {
        if (!product.recipe_id) continue;

        const availability = await checkRecipeAvailability(
          product.recipe_id,
          product.quantity_sold,
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
          .filter(p => p.recipe_id)
          .map(product => ({
            product,
            reason: "System error checking availability",
            maxQuantity: 0
          }))
      };
    }
  }, [storeId]);

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
    // This would fetch recipe details and calculate what will be deducted
    // Implementation would be similar to checkProductAvailability but with more detail
    
    const preview: any[] = [];
    const warnings: string[] = [];

    // For now, return empty preview - this can be implemented later
    return { preview, warnings };
  }, [storeId]);

  return {
    processRecipeDeductions,
    checkProductAvailability,
    getDeductionPreview,
    isProcessing,
    lastDeductionResult
  };
}

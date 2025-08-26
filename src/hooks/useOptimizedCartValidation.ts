import { useState, useCallback } from "react";
import { CartItem } from "@/types";
import { OptimizedValidationService } from "@/services/productCatalog/optimizedValidationService";

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  lowStockIngredients: string[];
}

interface CartValidationHook {
  validationResults: Map<string, ValidationResult>;
  isValidating: boolean;
  validateCart: (items: CartItem[], storeId: string) => Promise<boolean>;
  getItemValidation: (productId: string) => ValidationResult | null;
}

/**
 * Optimized cart validation hook for real-time validation
 */
export function useOptimizedCartValidation(storeId: string): CartValidationHook {
  const [validationResults, setValidationResults] = useState<Map<string, ValidationResult>>(new Map());
  const [isValidating, setIsValidating] = useState(false);

  const validateCart = useCallback(async (items: CartItem[], storeId: string): Promise<boolean> => {
    if (items.length === 0) return true;

    setIsValidating(true);

    try {
      // Use optimized batch validation
      const productRequests = items.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }));

      const validationResults = await OptimizedValidationService.batchValidateProducts(
        productRequests,
        storeId
      );

      // Convert results to our local format
      const newResults = new Map<string, ValidationResult>();
      let allValid = true;

      for (const [productId, result] of validationResults.entries()) {
        const validationResult: ValidationResult = {
          isValid: result.isValid,
          errors: result.errors || [],
          lowStockIngredients: result.lowStockIngredients || []
        };

        newResults.set(productId, validationResult);
        
        if (!result.isValid) {
          allValid = false;
        }
      }

      setValidationResults(newResults);
      
      console.log(`🔍 Optimized cart validation completed: ${allValid ? 'VALID' : 'INVALID'} (${items.length} items)`);
      
      return allValid;
    } catch (error) {
      console.error('Cart validation error:', error);
      return false;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const getItemValidation = useCallback((productId: string): ValidationResult | null => {
    return validationResults.get(productId) || null;
  }, [validationResults]);

  return {
    validationResults,
    isValidating,
    validateCart,
    getItemValidation
  };
}
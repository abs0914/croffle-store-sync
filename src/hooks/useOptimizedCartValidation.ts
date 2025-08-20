import { useState, useEffect, useCallback } from "react";
import { validateProductForSale, ProductValidationResult } from "@/services/productCatalog/productValidationService";
import { CartItem } from "@/types";

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  lowStockIngredients: string[];
}

interface CartValidationHook {
  validationResults: Map<string, ValidationResult>;
  isValidating: boolean;
  validateCart: (items: CartItem[]) => Promise<boolean>;
  getItemValidation: (productId: string) => ValidationResult | null;
}

/**
 * Optimized cart validation hook for real-time validation
 */
export function useOptimizedCartValidation(): CartValidationHook {
  const [validationResults, setValidationResults] = useState<Map<string, ValidationResult>>(new Map());
  const [isValidating, setIsValidating] = useState(false);

  const validateCart = useCallback(async (items: CartItem[]): Promise<boolean> => {
    if (items.length === 0) return true;

    setIsValidating(true);
    const newResults = new Map<string, ValidationResult>();

    try {
      // Validate all items in parallel for speed
      const validationPromises = items.map(async (item) => {
        try {
          const validation = await validateProductForSale(item.productId, item.quantity);
          
          const result: ValidationResult = {
            isValid: validation.isValid,
            errors: validation.errors || [],
            lowStockIngredients: validation.lowStockIngredients || []
          };

          newResults.set(item.productId, result);
          return result.isValid;
        } catch (error) {
          console.error(`Validation failed for ${item.productId}:`, error);
          const errorResult: ValidationResult = {
            isValid: false,
            errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
            lowStockIngredients: []
          };
          newResults.set(item.productId, errorResult);
          return false;
        }
      });

      const results = await Promise.all(validationPromises);
      setValidationResults(newResults);
      
      const allValid = results.every(result => result);
      console.log(`🔍 Cart validation completed: ${allValid ? 'VALID' : 'INVALID'} (${items.length} items)`);
      
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
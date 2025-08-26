
import { useState, useCallback } from 'react';
import { validateInventoryAvailability } from '@/services/inventory/simpleInventoryService';
import { CartItem } from '@/types';

interface InventoryValidationResult {
  isValid: boolean;
  insufficientItems?: string[];
}

export const useInventoryValidation = (storeId: string) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<Map<string, InventoryValidationResult>>(new Map());

  const validateCartItems = useCallback(async (items: CartItem[]): Promise<boolean> => {
    if (!storeId) return false;
    
    setIsValidating(true);
    const results = new Map<string, InventoryValidationResult>();
    let allValid = true;

    try {
      // Convert cart items to the format expected by the new service
      const validationItems = items.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }));

      const { available, insufficientItems } = await validateInventoryAvailability(storeId, validationItems);
      
      // Create validation results for each item
      for (const item of items) {
        const key = `${item.productId}-${item.variationId || 'default'}`;
        results.set(key, {
          isValid: available,
          insufficientItems: insufficientItems
        });
        
        if (!available) {
          allValid = false;
        }
      }

      setValidationResults(results);
      return allValid;
    } catch (error) {
      console.error('Error validating cart items:', error);
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [storeId]);

  const getItemValidation = useCallback((productId: string, variationId?: string): InventoryValidationResult | null => {
    const key = `${productId}-${variationId || 'default'}`;
    return validationResults.get(key) || null;
  }, [validationResults]);

  return {
    isValidating,
    validationResults,
    validateCartItems,
    getItemValidation
  };
};

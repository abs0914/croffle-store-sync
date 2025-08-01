
import { useState, useCallback } from 'react';
import { validateProductAvailability, InventoryValidationResult } from '@/services/productCatalog/inventoryIntegrationService';
import { CartItem } from '@/types';

export const useInventoryValidation = (storeId: string) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<Map<string, InventoryValidationResult>>(new Map());

  const validateCartItems = useCallback(async (items: CartItem[]): Promise<boolean> => {
    if (!storeId) return false;
    
    setIsValidating(true);
    const results = new Map<string, InventoryValidationResult>();
    let allValid = true;

    try {
      for (const item of items) {
        const key = `${item.productId}-${item.variationId || 'default'}`;
        const result = await validateProductAvailability(item.productId, item.quantity);
        results.set(key, result);
        
        if (!result.isValid) {
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

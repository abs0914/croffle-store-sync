
import { useState, useCallback } from 'react';
import { validateProductAvailability, processProductSale, InventoryValidationResult } from '@/services/productCatalog/inventoryIntegrationService';
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

  const processCartSale = useCallback(async (
    items: CartItem[], 
    transactionId: string
  ): Promise<boolean> => {
    if (!storeId) return false;

    try {
      // Process each item
      for (const item of items) {
        const success = await processProductSale(
          item.productId,
          item.quantity,
          transactionId,
          storeId
        );
        
        if (!success) {
          throw new Error(`Failed to process sale for ${item.product.name}`);
        }
      }

      return true;
    } catch (error) {
      console.error('Error processing cart sale:', error);
      return false;
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
    processCartSale,
    getItemValidation
  };
};

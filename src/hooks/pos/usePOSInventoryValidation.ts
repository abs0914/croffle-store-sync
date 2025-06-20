
import { useState, useCallback } from 'react';
import { 
  checkProductInventoryAvailability, 
  processInventoryDeduction,
  InventoryCheckResult,
  POSInventoryUpdate
} from '@/services/pos/inventoryIntegrationService';
import { CartItem } from '@/contexts/cart/types';
import { toast } from 'sonner';

export const usePOSInventoryValidation = (storeId: string) => {
  const [isValidating, setIsValidating] = useState(false);
  const [inventoryResults, setInventoryResults] = useState<Map<string, InventoryCheckResult>>(new Map());

  const validateCartItems = useCallback(async (items: CartItem[]): Promise<boolean> => {
    if (!storeId) return false;
    
    setIsValidating(true);
    const results = new Map<string, InventoryCheckResult>();
    let allValid = true;

    try {
      for (const item of items) {
        const key = `${item.productId}-${item.variationId || 'default'}`;
        const result = await checkProductInventoryAvailability(
          item.productId,
          item.quantity,
          storeId,
          item.variationId
        );
        
        results.set(key, result);
        
        if (!result.isAvailable) {
          allValid = false;
          toast.error(
            `Insufficient stock for ${result.productName}. Available: ${result.availableQuantity}, Requested: ${item.quantity}`
          );
        }
      }

      setInventoryResults(results);
      return allValid;
    } catch (error) {
      console.error('Error validating cart items:', error);
      toast.error('Failed to validate inventory');
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [storeId]);

  const processCartInventoryDeduction = useCallback(async (
    items: CartItem[],
    transactionId: string
  ): Promise<boolean> => {
    if (!storeId) return false;

    try {
      const updates: POSInventoryUpdate[] = items.map(item => ({
        productId: item.productId,
        variationId: item.variationId,
        quantitySold: item.quantity,
        transactionId,
        storeId
      }));

      const result = await processInventoryDeduction(updates);
      
      if (!result.success) {
        console.error('Inventory deduction errors:', result.errors);
        toast.error(`Inventory update failed: ${result.errors.join(', ')}`);
        return false;
      }

      toast.success('Inventory updated successfully');
      return true;
    } catch (error) {
      console.error('Error processing inventory deduction:', error);
      toast.error('Failed to update inventory');
      return false;
    }
  }, [storeId]);

  const getItemAvailability = useCallback((productId: string, variationId?: string): InventoryCheckResult | null => {
    const key = `${productId}-${variationId || 'default'}`;
    return inventoryResults.get(key) || null;
  }, [inventoryResults]);

  return {
    isValidating,
    inventoryResults,
    validateCartItems,
    processCartInventoryDeduction,
    getItemAvailability
  };
};


import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useUnifiedInventoryDeduction, ProductSaleItem } from '@/hooks/inventory/useUnifiedInventoryDeduction';
import { CartItem } from '@/contexts/cart/types';

export interface InventoryCheckResult {
  isAvailable: boolean;
  productName: string;
  availableQuantity: number;
  requiredQuantity: number;
  insufficientItems?: string[];
}

/**
 * @deprecated Use useUnifiedInventoryDeduction instead
 * This hook is kept for backward compatibility
 */
export const usePOSInventoryValidation = (storeId: string) => {
  const [isValidating, setIsValidating] = useState(false);
  const [inventoryResults, setInventoryResults] = useState<Map<string, InventoryCheckResult>>(new Map());
  
  const {
    checkProductAvailability,
    processProductSales,
    isProcessing
  } = useUnifiedInventoryDeduction(storeId);

  const validateCartItems = useCallback(async (items: CartItem[]): Promise<boolean> => {
    console.warn('usePOSInventoryValidation is deprecated, use useUnifiedInventoryDeduction instead');
    
    if (!storeId) return false;
    
    setIsValidating(true);
    const results = new Map<string, InventoryCheckResult>();
    let allValid = true;

    try {
      // Convert CartItem to ProductSaleItem
      const productSaleItems: ProductSaleItem[] = items.map(item => ({
        productId: item.productId,
        variationId: item.variationId,
        quantity: item.quantity,
        recipeId: item.product?.recipe_id // Assuming recipe_id is available on product
      }));

      const availability = await checkProductAvailability(productSaleItems);
      
      // Create results map for backward compatibility
      items.forEach(item => {
        const key = `${item.productId}-${item.variationId || 'default'}`;
        const unavailable = availability.unavailableProducts.find(
          up => up.product.productId === item.productId
        );
        
        if (unavailable) {
          allValid = false;
          results.set(key, {
            isAvailable: false,
            productName: item.product?.name || 'Unknown Product',
            availableQuantity: unavailable.maxQuantity,
            requiredQuantity: item.quantity,
            insufficientItems: [unavailable.reason]
          });
          
          toast.error(
            `Insufficient stock for ${item.product?.name}. Available: ${unavailable.maxQuantity}, Requested: ${item.quantity}`
          );
        } else {
          results.set(key, {
            isAvailable: true,
            productName: item.product?.name || 'Unknown Product',
            availableQuantity: item.quantity,
            requiredQuantity: item.quantity
          });
        }
      });

      setInventoryResults(results);
      return allValid;
    } catch (error) {
      console.error('Error validating cart items:', error);
      toast.error('Failed to validate inventory');
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [storeId, checkProductAvailability]);

  const processCartInventoryDeduction = useCallback(async (
    items: CartItem[],
    transactionId: string
  ): Promise<boolean> => {
    if (!storeId) return false;

    try {
      // Convert CartItem to ProductSaleItem
      const productSaleItems: ProductSaleItem[] = items.map(item => ({
        productId: item.productId,
        variationId: item.variationId,
        quantity: item.quantity,
        recipeId: item.product?.recipe_id // Assuming recipe_id is available on product
      }));

      const result = await processProductSales(productSaleItems, transactionId);
      
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
  }, [storeId, processProductSales]);

  const getItemAvailability = useCallback((productId: string, variationId?: string): InventoryCheckResult | null => {
    const key = `${productId}-${variationId || 'default'}`;
    return inventoryResults.get(key) || null;
  }, [inventoryResults]);

  return {
    isValidating: isValidating || isProcessing,
    inventoryResults,
    validateCartItems,
    processCartInventoryDeduction,
    getItemAvailability
  };
};

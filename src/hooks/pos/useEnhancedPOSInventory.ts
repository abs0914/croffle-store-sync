import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CartItem } from '@/contexts/cart/types';
import { 
  EnhancedPOSInventoryService, 
  POSInventoryItem, 
  POSInventoryResult 
} from '@/services/pos/enhancedPOSInventoryService';

export interface InventoryStatus {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  healthyItems: number;
  totalValue: number;
  supportsFractional: boolean;
}

/**
 * Enhanced POS hook for direct inventory integration with fractional support
 */
export const useEnhancedPOSInventory = (storeId: string) => {
  const [inventoryService] = useState(() => new EnhancedPOSInventoryService(storeId));
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus>({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    healthyItems: 0,
    totalValue: 0,
    supportsFractional: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);

  // Load initial inventory status
  useEffect(() => {
    if (storeId) {
      loadInventoryStatus();
      setupRealTimeUpdates();
    }
  }, [storeId]);

  const loadInventoryStatus = async () => {
    setIsLoading(true);
    try {
      const status = await inventoryService.getInventoryStatus();
      setInventoryStatus(status);
    } catch (error) {
      console.error('Error loading inventory status:', error);
      toast.error('Failed to load inventory status');
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealTimeUpdates = () => {
    if (!storeId) return;

    const channel = supabase
      .channel('pos-inventory-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_stock',
          filter: `store_id=eq.${storeId}`
        },
        (payload) => {
          console.log('Real-time inventory update:', payload);
          loadInventoryStatus(); // Refresh status on any inventory change
          
          if (payload.eventType === 'UPDATE') {
            const item = payload.new as any;
            const totalStock = (item.serving_quantity || 0) + (item.fractional_stock || 0);
            
            if (totalStock <= 0) {
              toast.warning(`${item.item} is now out of stock`);
            } else if (totalStock <= (item.minimum_threshold || 10)) {
              toast.info(`${item.item} is running low (${totalStock.toFixed(1)} remaining)`);
            }
          }
        }
      )
      .subscribe((status) => {
        setRealTimeEnabled(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  /**
   * Validate cart items against enhanced inventory
   */
  const validateCartInventory = useCallback(async (
    cartItems: CartItem[]
  ): Promise<POSInventoryResult> => {
    if (!storeId || cartItems.length === 0) {
      return { available: true, totalAvailable: 0, insufficientItems: [] };
    }

    try {
      setIsLoading(true);

      // Convert cart items to POS inventory items
      const productIds = cartItems.map(item => item.productId);
      const posInventoryItems = await inventoryService.loadPOSProductData(productIds);

      // Map quantities from cart
      const itemsWithQuantities: POSInventoryItem[] = cartItems.map(cartItem => {
        const posItem = posInventoryItems.find(item => item.productId === cartItem.productId);
        return {
          ...posItem!,
          quantity: cartItem.quantity,
          variationId: cartItem.variationId
        };
      });

      const result = await inventoryService.checkCartAvailability(itemsWithQuantities);
      
      if (!result.available) {
        const itemsList = result.insufficientItems
          .map(item => `${item.item}: need ${item.required}, have ${item.available}`)
          .join('; ');
        toast.error(`Insufficient inventory: ${itemsList}`);
      }

      return result;
    } catch (error) {
      console.error('Error validating cart inventory:', error);
      toast.error('Failed to validate inventory');
      return { available: false, totalAvailable: 0, insufficientItems: [] };
    } finally {
      setIsLoading(false);
    }
  }, [storeId, inventoryService]);

  /**
   * Process inventory deductions for completed transaction
   */
  const processTransactionInventory = useCallback(async (
    cartItems: CartItem[],
    transactionId: string
  ): Promise<boolean> => {
    if (!storeId || cartItems.length === 0) return true;

    try {
      setIsLoading(true);

      // Convert cart items to POS inventory items
      const productIds = cartItems.map(item => item.productId);
      const posInventoryItems = await inventoryService.loadPOSProductData(productIds);

      // Map quantities from cart
      const itemsWithQuantities: POSInventoryItem[] = cartItems.map(cartItem => {
        const posItem = posInventoryItems.find(item => item.productId === cartItem.productId);
        return {
          ...posItem!,
          quantity: cartItem.quantity,
          variationId: cartItem.variationId
        };
      });

      const result = await inventoryService.processTransactionDeductions(
        itemsWithQuantities,
        transactionId
      );

      if (result.success) {
        // Refresh inventory status after successful deduction
        await loadInventoryStatus();
        return true;
      } else {
        console.error('Inventory deduction errors:', result.errors);
        toast.error(`Inventory update failed: ${result.errors.join(', ')}`);
        return false;
      }
    } catch (error) {
      console.error('Error processing transaction inventory:', error);
      toast.error('Failed to update inventory');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [storeId, inventoryService]);

  /**
   * Get detailed inventory information for a specific product
   */
  const getProductInventoryDetails = useCallback(async (productId: string) => {
    try {
      const posItems = await inventoryService.loadPOSProductData([productId]);
      return posItems[0] || null;
    } catch (error) {
      console.error('Error getting product inventory details:', error);
      return null;
    }
  }, [inventoryService]);

  /**
   * Check if a specific quantity of a product can be sold
   */
  const canSellQuantity = useCallback(async (
    productId: string,
    quantity: number,
    variationId?: string
  ): Promise<boolean> => {
    try {
      const posItems = await inventoryService.loadPOSProductData([productId]);
      const item = posItems[0];
      
      if (!item) return false;

      const itemWithQuantity = { ...item, quantity, variationId };
      const result = await inventoryService.checkCartAvailability([itemWithQuantity]);
      
      return result.available;
    } catch (error) {
      console.error('Error checking if can sell quantity:', error);
      return false;
    }
  }, [inventoryService]);

  return {
    inventoryStatus,
    isLoading,
    realTimeEnabled,
    validateCartInventory,
    processTransactionInventory,
    getProductInventoryDetails,
    canSellQuantity,
    refreshInventoryStatus: loadInventoryStatus
  };
};
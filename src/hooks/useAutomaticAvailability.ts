import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { updateAllProductsAvailability } from '@/services/productCatalog/automaticAvailabilityService';
import { toast } from 'sonner';

/**
 * Hook to set up automatic product availability monitoring
 * Listens for inventory changes and updates product availability accordingly
 */
export const useAutomaticAvailability = (storeId: string | null, enabled: boolean = true) => {
  const checkAvailability = useCallback(async () => {
    if (!storeId || !enabled) return;

    try {
      const result = await updateAllProductsAvailability(storeId, true);
      
      if (result.totalUpdated > 0) {
        console.log(`Auto-updated availability for ${result.totalUpdated} products in store ${storeId}`);
      }
    } catch (error) {
      console.error('Error in automatic availability check:', error);
    }
  }, [storeId, enabled]);

  // Set up real-time subscription for inventory changes
  useEffect(() => {
    if (!storeId || !enabled) return;

    console.log(`Setting up automatic availability monitoring for store: ${storeId}`);

    // Subscribe to inventory stock changes
    const inventorySubscription = supabase
      .channel(`inventory_changes_${storeId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'inventory_stock',
          filter: `store_id=eq.${storeId}`
        }, 
        (payload) => {
          console.log('Inventory change detected, checking product availability:', payload);
          
          // Debounce the availability check to avoid too many updates
          setTimeout(() => {
            checkAvailability();
          }, 2000); // 2 second delay
        }
      )
      .subscribe();

    // Subscribe to product ingredients changes
    const ingredientsSubscription = supabase
      .channel(`ingredients_changes_${storeId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'product_ingredients'
        }, 
        (payload) => {
          console.log('Product ingredients change detected, checking availability:', payload);
          
          // Check availability after ingredient changes
          setTimeout(() => {
            checkAvailability();
          }, 1000); // 1 second delay
        }
      )
      .subscribe();

    // Initial availability check
    checkAvailability();

    // Set up periodic check every 5 minutes
    const periodicCheck = setInterval(() => {
      checkAvailability();
    }, 5 * 60 * 1000); // 5 minutes

    // Cleanup
    return () => {
      console.log(`Cleaning up automatic availability monitoring for store: ${storeId}`);
      inventorySubscription.unsubscribe();
      ingredientsSubscription.unsubscribe();
      clearInterval(periodicCheck);
    };
  }, [storeId, enabled, checkAvailability]);

  return {
    checkAvailability
  };
};

export default useAutomaticAvailability;

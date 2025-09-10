
import { useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/auth";
import { useQuery } from "@tanstack/react-query";
import { fetchInventoryStock } from "@/services/inventoryStock";
import { supabase } from "@/integrations/supabase/client";

export const useInventoryStockCore = () => {
  const { currentStore } = useStore();
  const { user } = useAuth();
  const [hasMultipleStores, setHasMultipleStores] = useState(false);
  
  // Check if user has access to multiple stores
  useQuery({
    queryKey: ['user-stores-count'],
    queryFn: async () => {
      if (!user) return { count: 0 };
      
      try {
        const { count, error } = await supabase
          .from('user_stores')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id);
        
        if (error) {
          console.warn('Failed to fetch user stores count:', error.message);
          // Fallback: assume single store if query fails
          setHasMultipleStores(false);
          return { count: 1 };
        }
        
        setHasMultipleStores(count !== null && count > 1);
        return { count };
      } catch (error) {
        console.warn('Error checking user stores count:', error);
        // Graceful fallback
        setHasMultipleStores(false);
        return { count: 1 };
      }
    },
    enabled: !!user?.id,
    retry: false // Don't retry failed permission checks
  });
  
  // Query to fetch inventory stock
  const { data: stockItems = [], isLoading } = useQuery({
    queryKey: ['inventory-stock', currentStore?.id],
    queryFn: () => currentStore ? fetchInventoryStock(currentStore.id) : Promise.resolve([]),
    enabled: !!currentStore?.id
  });

  return {
    currentStore,
    stockItems,
    isLoading,
    hasMultipleStores
  };
};

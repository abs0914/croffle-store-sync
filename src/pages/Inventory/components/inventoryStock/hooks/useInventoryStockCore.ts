
import { useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/auth";
import { useQuery } from "@tanstack/react-query";
import { fetchInventoryStock } from "@/services/inventoryStock";
import { supabase } from "@/integrations/supabase/client";

export const useInventoryStockCore = () => {
  const { currentStore } = useStore();
  const { user, isLoading: authLoading } = useAuth();
  const [hasMultipleStores, setHasMultipleStores] = useState(false);
  
  // Check if user has access to multiple stores - use storeIds from user object instead
  useQuery({
    queryKey: ['user-stores-count', user?.id],
    queryFn: async () => {
      if (!user || !user.storeIds) {
        setHasMultipleStores(false);
        return { count: 0 };
      }
      
      // Use the storeIds from the user object instead of querying user_stores
      const storeCount = user.storeIds.length;
      setHasMultipleStores(storeCount > 1);
      return { count: storeCount };
    },
    enabled: !!user?.id && !authLoading,
    retry: false,
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
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

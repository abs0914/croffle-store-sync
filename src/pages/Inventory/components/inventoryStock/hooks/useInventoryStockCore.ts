
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
      
      const { count, error } = await supabase
        .from('user_stores')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setHasMultipleStores(count !== null && count > 1);
      return { count };
    },
    enabled: !!user?.id
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

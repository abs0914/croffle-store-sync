
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Store } from "@/types";

export const useStoresData = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredStores(stores);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = stores.filter(store => 
        store.name.toLowerCase().includes(query) || 
        store.address.toLowerCase().includes(query) ||
        (store.email && store.email.toLowerCase().includes(query)) ||
        (store.phone && store.phone.includes(query))
      );
      setFilteredStores(filtered);
    }
  }, [searchQuery, stores]);

  const fetchStores = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      setStores(data as Store[] || []);
      setFilteredStores(data as Store[] || []);
    } catch (error: any) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    if (confirm('Are you sure you want to delete this store? This action cannot be undone.')) {
      try {
        const { error } = await supabase
          .from('stores')
          .delete()
          .eq('id', storeId);

        if (error) {
          throw error;
        }

        toast.success('Store deleted successfully');
        fetchStores();
      } catch (error: any) {
        console.error('Error deleting store:', error);
        toast.error('Failed to delete store');
      }
    }
  };

  return {
    stores,
    filteredStores,
    searchQuery,
    setSearchQuery,
    isLoading,
    handleDeleteStore
  };
};


import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Store } from '@/types';

export const useStoresData = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: stores = [], isLoading, error, refetch } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform the data to match the Store interface
      const transformedStores = (data || []).map(store => ({
        ...store,
        address: store.address || '',
        location: store.address || `${store.city || ''}, ${store.country || ''}`.trim() || 'Unknown Location'
      })) as Store[];
      
      return transformedStores;
    }
  });

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteStore = async (storeId: string) => {
    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeId);
      
      if (error) throw error;
      
      await refetch();
    } catch (error) {
      console.error('Error deleting store:', error);
    }
  };

  return {
    stores,
    filteredStores,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    refetch,
    handleDeleteStore
  };
};
